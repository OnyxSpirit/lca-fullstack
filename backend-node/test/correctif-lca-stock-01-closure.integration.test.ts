import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import supertest from 'supertest';
import { createApp } from '../src/app.js';
import { execute, pool, query } from '../src/config/database.js';
import { bootstrapDatabase } from '../src/scripts/database-bootstrap.js';
import { issueMysqlAccessToken } from './helpers/mysql-auth-session-fixture.js';

const enabled = process.env.CORRECTIF_LCA_STOCK_CLOSURE_MYSQL === '1';
if (enabled) after(() => pool.end());
const add = async (sql: string, params: unknown[] = []) => String((await pool.execute<ResultSetHeader>(sql, params))[0].insertId);
const rows = (sql: string, params: unknown[] = []) => query<RowDataPacket[]>(sql, params);

test('CORRECTIF-LCA-STOCK-01 clôture API/MySQL T024-T040 T067-T068 T072 T078 T083-T090', { skip: !enabled, timeout: 300_000 }, async () => {
  assert.match(process.env.DB_NAME ?? process.env.MYSQL_DATABASE ?? '', /lca_recette|integrations/);
  const bootstrapBefore = await bootstrapDatabase();
  assert.ok(bootstrapBefore.version >= 138);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const concession = await add('INSERT INTO concessions(name,code) VALUES(?,?)', [`Clôture stock ${suffix}`, `CS${suffix}`]);
  const agencyA = await add('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)', [concession, 'Agence clôture A', `CA${suffix}`]);
  const agencyB = await add('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)', [concession, 'Agence clôture B', `CB${suffix}`]);
  const role = (await rows("SELECT id FROM roles WHERE code='SUPER_ADMIN' AND is_system=TRUE"))[0]!;
  const email = `stock-closure-${suffix}@test.local`;
  const user = await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active) VALUES(?,'Clôture','Stock',?,'unused',TRUE)", [agencyA, email]);
  await execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)', [user, role.id]);
  const [sessionA, sessionB] = await Promise.all([
    issueMysqlAccessToken({ userId: user, email, agencyId: agencyA }),
    issueMysqlAccessToken({ userId: user, email, agencyId: agencyB }),
  ]);
  const api = supertest(createApp());
  const auth = (token: string, call: supertest.Test) => call.set('Authorization', `Bearer ${token}`);
  const postOrder = (token: string, body: Record<string, unknown>) => auth(token, api.post('/api/vehicle-orders')).send(body);
  const brandA = await add('INSERT INTO brands(name,code,is_active) VALUES(?,?,TRUE)', [`Marque A ${suffix}`, `BA${suffix}`]);
  const brandB = await add('INSERT INTO brands(name,code,is_active) VALUES(?,?,TRUE)', [`Marque B ${suffix}`, `BB${suffix}`]);
  const modelA = await add('INSERT INTO models(brand_id,name,code,is_active) VALUES(?,?,?,TRUE)', [brandA, `Modèle A ${suffix}`, `MA${suffix}`]);
  const modelB = await add('INSERT INTO models(brand_id,name,code,is_active) VALUES(?,?,?,TRUE)', [brandB, `Modèle B ${suffix}`, `MB${suffix}`]);
  const versionA = await add('INSERT INTO versions(model_id,name,code,is_active) VALUES(?,?,?,TRUE)', [modelA, `Version A ${suffix}`, `VA${suffix}`]);
  const versionB = await add('INSERT INTO versions(model_id,name,code,is_active) VALUES(?,?,?,TRUE)', [modelB, `Version B ${suffix}`, `VB${suffix}`]);
  const inactiveBrand = await add('INSERT INTO brands(name,code,is_active) VALUES(?,?,FALSE)', [`Marque inactive ${suffix}`, `BI${suffix}`]);
  const inactiveModel = await add('INSERT INTO models(brand_id,name,code,is_active) VALUES(?,?,?,FALSE)', [brandA, `Modèle inactif ${suffix}`, `MI${suffix}`]);
  const inactiveVersion = await add('INSERT INTO versions(model_id,name,code,is_active) VALUES(?,?,?,FALSE)', [modelA, `Version inactive ${suffix}`, `VI${suffix}`]);

  assert.equal((await postOrder(sessionA.accessToken, { brandId: brandA, modelId: modelB, quantity: 1, clientRequestId: randomUUID() })).status, 400, 'T024');
  assert.equal((await postOrder(sessionA.accessToken, { brandId: brandA, modelId: modelA, versionId: versionB, quantity: 1, clientRequestId: randomUUID() })).status, 400, 'T025');
  assert.equal((await postOrder(sessionA.accessToken, { brandId: inactiveBrand, modelName: 'Nouveau', quantity: 1, clientRequestId: randomUUID() })).status, 409, 'T026');
  assert.equal((await postOrder(sessionA.accessToken, { brandId: brandA, modelId: inactiveModel, quantity: 1, clientRequestId: randomUUID() })).status, 400, 'T027');
  assert.equal((await postOrder(sessionA.accessToken, { brandId: brandA, modelId: modelA, versionId: inactiveVersion, quantity: 1, clientRequestId: randomUUID() })).status, 400, 'T028');

  const commandKey = randomUUID();
  const commandA = await postOrder(sessionA.accessToken, { brandId: brandA, modelId: modelA, versionId: versionA, quantity: 3, clientRequestId: commandKey });
  const commandReplay = await postOrder(sessionA.accessToken, { brandId: brandA, modelId: modelA, versionId: versionA, quantity: 3, clientRequestId: commandKey });
  assert.equal(commandA.status, 201, commandA.text);
  assert.equal(commandReplay.status, 200, commandReplay.text);
  assert.equal(commandReplay.body.id, commandA.body.id, 'T034');
  assert.equal(commandReplay.body.duplicate, true, 'T034');
  const foreignKey = randomUUID();
  const commandB = await postOrder(sessionB.accessToken, { brandId: brandA, modelId: modelA, quantity: 1, clientRequestId: foreignKey });
  assert.equal(commandB.status, 201, commandB.text);
  assert.equal((await postOrder(sessionA.accessToken, { brandId: brandA, modelId: modelA, quantity: 1, clientRequestId: foreignKey })).status, 409, 'T035');

  const receiptKey = randomUUID();
  const receive = (orderId: string, quantity: number, key: string) => auth(sessionA.accessToken, api.post(`/api/vehicle-orders/${orderId}/receipts`)).send({ quantity, clientRequestId: key });
  const receipt = await receive(String(commandA.body.id), 1, receiptKey);
  const receiptReplay = await receive(String(commandA.body.id), 1, receiptKey);
  assert.equal(receipt.status, 201, receipt.text);
  assert.equal(receiptReplay.status, 200, receiptReplay.text);
  assert.deepEqual(receiptReplay.body.vehicleIds, receipt.body.vehicleIds, 'T036');
  const other = await postOrder(sessionA.accessToken, { brandId: brandA, modelId: modelA, quantity: 1, clientRequestId: randomUUID() });
  assert.equal((await receive(String(other.body.id), 1, receiptKey)).status, 409, 'T037');
  assert.equal((await receive(String(commandA.body.id), 3, randomUUID())).status, 409, 'T039');
  assert.equal((await receive(String(commandA.body.id), 0, randomUUID())).status, 400, 'T040');
  const exact = await receive(String(commandA.body.id), 2, randomUUID());
  assert.equal(exact.status, 201, exact.text);
  assert.equal(exact.body.quantityRemaining, 0, 'T038');
  assert.equal((await auth(sessionA.accessToken, api.get(`/api/vehicle-orders/${commandB.body.id}`))).status, 404, 'T078');

  const beforeStats = (await auth(sessionA.accessToken, api.get('/api/vehicles/stats'))).body;
  await execute("UPDATE vehicles SET sale_price=987654321,entry_date=DATE_SUB(CURDATE(),INTERVAL 120 DAY) WHERE vehicle_order_id=?", [other.body.id]);
  const orderedStats = (await auth(sessionA.accessToken, api.get('/api/vehicles/stats'))).body;
  assert.equal(orderedStats.stockValue, beforeStats.stockValue, 'T067');
  assert.equal(orderedStats.dormant, beforeStats.dormant, 'T068');
  const manual = await add("INSERT INTO vehicles(version_id,agency_id,commercial_origin,commercial_origin_source,is_commercial_stock,vehicle_type,status,entry_date,sale_price,created_by) VALUES(?,?,'CONCESSION','MANUAL',TRUE,'new','ordered',NULL,123456789,?)", [versionA, agencyA, user]);
  await execute('UPDATE vehicles SET stock_number=? WHERE id=?', [`MAN-${suffix}`, manual]);
  const manualStats = (await auth(sessionA.accessToken, api.get('/api/vehicles/stats'))).body;
  assert.equal(manualStats.physical, orderedStats.physical, 'T072');

  const commercialModel = await add("INSERT INTO commercial_models(version_id,configuration,catalog_price,currency_code,is_commercially_available,created_by) VALUES(?,'Historique',25000000,'XAF',TRUE,?)", [versionA, user]);
  const historicalOrder = await add('INSERT INTO vehicle_orders(order_number,commercial_model_id,agency_id,quantity_ordered,client_request_id,created_by) VALUES(?,?,?,?,?,?)', [`HIST-${suffix}`, commercialModel, agencyA, 1, randomUUID(), user]);
  const list = await auth(sessionA.accessToken, api.get('/api/vehicle-orders').query({ search: `HIST-${suffix}`, page: 1, pageSize: 10 }));
  assert.equal(list.status, 200, list.text);
  assert.ok(list.body.items.some((item: RowDataPacket) => String(item.id) === historicalOrder), 'T083');
  const profileBefore = (await rows('SELECT version_id,configuration,catalog_price,currency_code FROM commercial_models WHERE id=?', [commercialModel]))[0]!;
  const historicalBefore = (await rows('SELECT order_number,commercial_model_id,quantity_ordered,client_request_id FROM vehicle_orders WHERE id=?', [historicalOrder]))[0]!;
  const bootstrapReplay = await bootstrapDatabase();
  assert.equal(bootstrapReplay.version, bootstrapBefore.version, 'T086');
  assert.deepEqual((await rows('SELECT version_id,configuration,catalog_price,currency_code FROM commercial_models WHERE id=?', [commercialModel]))[0], profileBefore, 'T084');
  assert.deepEqual((await rows('SELECT order_number,commercial_model_id,quantity_ordered,client_request_id FROM vehicle_orders WHERE id=?', [historicalOrder]))[0], historicalBefore, 'T090');
  const definitions = await rows("SELECT COLUMN_NAME,DATA_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vehicle_orders' AND COLUMN_NAME IN ('brand_id','model_id','version_id') ORDER BY COLUMN_NAME");
  assert.deepEqual(definitions.map(row => [row.COLUMN_NAME, row.DATA_TYPE, row.IS_NULLABLE]), [['brand_id', 'bigint', 'YES'], ['model_id', 'bigint', 'YES'], ['version_id', 'bigint', 'YES']], 'T088');
  await assert.rejects(() => execute('INSERT INTO vehicle_orders(order_number,brand_id,model_id,agency_id,quantity_ordered,client_request_id,created_by) VALUES(?,?,?,?,?,?,?)', [`FK-${suffix}`, '999999999', modelA, agencyA, 1, randomUUID(), user]), (error: NodeJS.ErrnoException) => error.code === 'ER_NO_REFERENCED_ROW_2', 'T089');
});
