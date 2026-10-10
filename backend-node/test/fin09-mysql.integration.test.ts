import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import jwt from 'jsonwebtoken';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import supertest from 'supertest';
import { createApp } from '../src/app.js';
import { pool, query } from '../src/config/database.js';
import { bootstrapDatabase } from '../src/scripts/database-bootstrap.js';

const enabled = process.env.FIN09_MYSQL_TEST === '1';
if (enabled) after(() => pool.end());

test('FIN09 MySQL 8.4 protège les réservations contre les sorties libres concurrentes', { skip: !enabled, timeout: 300_000 }, async () => {
  assert.equal((await bootstrapDatabase()).version, 76);
  const superAdmins = await query<RowDataPacket[]>("SELECT COUNT(*) total FROM roles r JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE r.code='SUPER_ADMIN' AND p.is_active=TRUE");
  assert.ok(Number(superAdmins[0]?.total) > 0);

  const add = async (sql: string, params: unknown[] = []) => String((await pool.execute<ResultSetHeader>(sql, params))[0].insertId);
  const suffix = randomUUID().slice(0, 8);
  const concession = await add('INSERT INTO concessions(name,code,currency_code) VALUES(?,?,?)', [`FIN09 ${suffix}`, `F9${suffix}`, 'XAF']);
  const agency = await add('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)', [concession, 'Agence FIN09', `F9A${suffix}`]);
  const role = await add('INSERT INTO roles(name,code) VALUES(?,?)', [`FIN09 ${suffix}`, `FIN09_${suffix}`]);
  for (const code of ['treasury.view', 'treasury.disbursement.create', 'treasury.coverage.view', 'treasury.reservation.create']) {
    await pool.execute("INSERT INTO role_permissions(role_id,permission_id,scope) SELECT ?,id,'AGENCY' FROM permissions WHERE code=?", [role, code]);
  }
  const user = await add('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)', [agency, 'Recette', 'FIN09', `fin09-${suffix}@test.local`, 'unused']);
  await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)', [user, role]);
  const sid = randomUUID();
  await pool.execute('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,DATE_ADD(NOW(),INTERVAL 1 HOUR))', [sid, user, randomUUID().replaceAll('-', '').padEnd(64, '0')]);
  const account = await add("INSERT INTO treasury_accounts(concession_id,agency_id,code,name,account_type,currency_code,created_by) VALUES(?,?,?,?, 'BANK','XAF',?)", [concession, agency, `BANK${suffix}`, 'Banque FIN09', user]);
  const category = await add("INSERT INTO treasury_categories(concession_id,code,name,allowed_direction,created_by) VALUES(?,?,?,'OUT',?)", [concession, `OUT${suffix}`, 'Sorties FIN09', user]);
  await pool.execute("INSERT INTO treasury_movements(account_id,direction,amount,currency_code,value_date,description,source_type,source_id,event_type,status,created_by) VALUES(?,'IN',5000000,'XAF','2026-10-10','Solde fictif','OPENING_BALANCE',?,'OPENED','POSTED',?)", [account, account, user]);
  const budget = await add("INSERT INTO budgets(scope_type,agency_id,label,initial_amount,start_date,end_date,status,created_by) VALUES('agency',?,'Budget FIN09',5000000,'2026-01-01','2026-12-31','active',?)", [agency, user]);
  const expense = await add("INSERT INTO budget_expenses(budget_id,label,amount,expense_date,approval_status,created_by) VALUES(?,'Engagement réservé',4000000,'2026-10-10','approved',?)", [budget, user]);
  const token = jwt.sign({ sub: user, sid, email: `fin09-${suffix}@test.local`, roles: [], agencyId: agency }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '10m' });
  const api = supertest(createApp());
  const auth = (request: supertest.Test) => request.set('Authorization', `Bearer ${token}`);
  const reservation = await auth(api.post('/api/treasury/reservations')).send({ accountId: account, budgetExpenseId: expense, amount: '4000000', reason: 'Engagement protégé FIN09', clientRequestId: randomUUID() });
  assert.equal(reservation.status, 201, reservation.text);

  const body = (amount: string) => ({ accountId: account, amount, categoryId: category, valueDate: '2026-10-10', description: 'Décaissement libre FIN09', counterparty: 'Tiers fictif', clientRequestId: randomUUID() });
  const blocked = await auth(api.post('/api/treasury/manual-disbursements')).send(body('3000000'));
  assert.equal(blocked.status, 409, blocked.text);
  assert.match(blocked.body.message, /liquidités sont réservées/i);

  const race = await Promise.all([
    auth(api.post('/api/treasury/manual-disbursements')).send(body('800000')),
    auth(api.post('/api/treasury/manual-disbursements')).send(body('800000')),
  ]);
  assert.deepEqual(race.map(response => response.status).sort(), [201, 409]);
  const balance = await query<RowDataPacket[]>("SELECT SUM(CASE WHEN direction='IN' THEN amount ELSE -amount END) balance FROM treasury_movements WHERE account_id=? AND status='POSTED'", [account]);
  const active = await query<RowDataPacket[]>("SELECT SUM(active_amount) reserved FROM treasury_reservations WHERE account_id=? AND status='ACTIVE'", [account]);
  assert.equal(Number(balance[0]?.balance), 4_200_000);
  assert.equal(Number(active[0]?.reserved), 4_000_000);
});
