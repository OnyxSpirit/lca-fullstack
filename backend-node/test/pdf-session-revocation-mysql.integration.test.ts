import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {after,test} from 'node:test';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import type {RowDataPacket} from 'mysql2/promise';
import {createApp} from '../src/app.js';
import {execute,pool,query} from '../src/config/database.js';

const enabled=process.env.LCA_PDF_SESSION_DB_TEST==='1';
if(enabled)after(async()=>pool.end());

test('PDF GED : une session révoquée perd immédiatement le téléchargement, une nouvelle session légitime le retrouve',{skip:!enabled},async()=>{
  const [document]=await query<RowDataPacket[]>("SELECT id,agency_id,entity_type FROM documents WHERE mime_type='application/pdf' AND is_archived=FALSE ORDER BY id LIMIT 1");
  assert.ok(document,'La recette GED doit avoir créé un PDF synthétique');
  const suffix=randomUUID().slice(0,8);
  const role=String((await execute('INSERT INTO roles(name,code) VALUES(?,?)',[`PDF session ${suffix}`,`PDF_SESSION_${suffix}`])).insertId);
  const businessPermission:Record<string,string>={delivery:'delivery.view',invoice:'billing.invoice.view',sale:'sales.view',vehicle:'vehicles.view',customer:'customers.view',repair_order:'service.order.view'};
  const permissionCodes=['ged.view',businessPermission[String(document.entity_type)]];
  assert.ok(permissionCodes[1],`Type GED non pris en charge par cette fixture: ${String(document.entity_type)}`);
  for(const code of permissionCodes){const [permission]=await query<RowDataPacket[]>('SELECT id FROM permissions WHERE code=?',[code]);assert.ok(permission,`Permission ${code} absente`);await pool.execute("INSERT INTO role_permissions(role_id,permission_id,scope) VALUES(?,?,'GLOBAL')",[role,permission.id])}
  const user=String((await execute('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[document.agency_id,'PDF','Session',`pdf-${suffix}@test.local`,'x'])).insertId);
  await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[user,role]);
  const issue=async()=>{
    const sid=randomUUID();
    await pool.execute('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,DATE_ADD(NOW(),INTERVAL 1 HOUR))',[sid,user,createHash('sha256').update(sid).digest('hex')]);
    return{sid,token:jwt.sign({sub:user,sid,email:`pdf-${suffix}@test.local`,roles:[],agencyId:String(document.agency_id)},process.env.JWT_ACCESS_SECRET!,{expiresIn:'15m'})};
  };
  const api=supertest(createApp()),first=await issue();
  const before=await api.get(`/api/documents/${document.id}/download`).set('Authorization',`Bearer ${first.token}`);
  assert.equal(before.status,200,before.text);assert.match(String(before.headers['content-type']),/application\/pdf/);
  await pool.execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=?',[first.sid]);
  const revoked=await api.get(`/api/documents/${document.id}/download`).set('Authorization',`Bearer ${first.token}`);
  assert.equal(revoked.status,401,revoked.text);
  const second=await issue(),legitimate=await api.get(`/api/documents/${document.id}/download`).set('Authorization',`Bearer ${second.token}`);
  assert.equal(legitimate.status,200,legitimate.text);assert.match(String(legitimate.headers['content-type']),/application\/pdf/);
});
