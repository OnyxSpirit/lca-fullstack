import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import argon2 from 'argon2';
import {createPool,type RowDataPacket} from 'mysql2/promise';
import {adminProvisioningConfig,provisionAdmin} from '../src/scripts/admin-provisioning.js';

const validEmail='initial-admin@invalid.test';
const firstPassword='Fictive!Seed-47-River';
const secondPassword='Fictive!Rotate-83-Cloud';

test('SA1-SA3 configuration obligatoire, explicite et robuste avant accès DB',()=>{
  assert.throws(()=>adminProvisioningConfig({ADMIN_PASSWORD:firstPassword}),/ADMIN_EMAIL est obligatoire/);
  assert.throws(()=>adminProvisioningConfig({ADMIN_EMAIL:validEmail}),/ADMIN_PASSWORD est obligatoire/);
  for(const password of['admin','admin123','password','123456789012','changeme','superadmin','replace_with_a_strong_initial_password',validEmail,'initial-admin']){
    assert.throws(()=>adminProvisioningConfig({ADMIN_EMAIL:validEmail,ADMIN_PASSWORD:password}),/ADMIN_PASSWORD/);
  }
  assert.throws(()=>adminProvisioningConfig({ADMIN_EMAIL:validEmail,ADMIN_PASSWORD:firstPassword,ADMIN_ROTATE_PASSWORD:'yes'}),/uniquement true ou false/);
  assert.equal(adminProvisioningConfig({ADMIN_EMAIL:validEmail,ADMIN_PASSWORD:firstPassword}).rotatePassword,false);
});

test('SA12 le wrapper ne journalise ni secret ni hash',()=>{
  const root=resolve(import.meta.dirname,'..');
  const wrapper=readFileSync(resolve(root,'src/scripts/seed-admin.ts'),'utf8');
  assert.doesNotMatch(wrapper,/console\.(?:log|error)\([^\n]*(?:config\.password|password_hash|ADMIN_PASSWORD|process\.env)/i);
  assert.doesNotMatch(wrapper,/console\.(?:log|error)\([^\n]*(?:config|process\.env)/i);
});

const mysqlEnabled=process.env.SEED_ADMIN_MYSQL_TEST==='1';
test('SA4-SA11 et SA13-SA16 provisioning atomique sur MySQL jetable',{skip:!mysqlEnabled},async()=>{
  const pool=createPool({
    host:process.env.SEED_DB_HOST??'127.0.0.1',
    port:Number(process.env.SEED_DB_PORT??3306),
    user:process.env.SEED_DB_USER??'test',
    password:process.env.SEED_DB_PASSWORD??'test',
    database:process.env.SEED_DB_NAME??'lca_seed_test',
    connectionLimit:6,
  });
  try{
    const[databaseRows]=await pool.execute<RowDataPacket[]>('SELECT DATABASE() database_name');
    assert.equal(databaseRows[0]!.database_name,'lca_seed_test','ce test destructif exige la base jetable lca_seed_test');
    await pool.execute('DELETE FROM users WHERE email IN (?,?)',[validEmail,'ordinary-user@invalid.test']);
    await pool.execute("DELETE FROM roles WHERE code='SUPER_ADMIN_FAKE_SEED_TEST'");
    const config=adminProvisioningConfig({ADMIN_EMAIL:validEmail,ADMIN_PASSWORD:firstPassword});
    const concurrent=await Promise.all([provisionAdmin(pool,config),provisionAdmin(pool,config)]);
    assert.deepEqual(concurrent.map(result=>result.action).sort(),['created','unchanged']);

    const[admins]=await pool.execute<RowDataPacket[]>(`SELECT u.id,u.email,u.password_hash,u.first_name,u.last_name,u.is_active,r.id role_id,r.code,r.is_system
      FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
      WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE`);
    assert.equal(admins.length,1);
    assert.equal(admins[0]!.email,validEmail);
    assert.equal(Number(admins[0]!.is_system),1);
    const originalHash=String(admins[0]!.password_hash);
    const identity=[admins[0]!.email,admins[0]!.first_name,admins[0]!.last_name,Number(admins[0]!.is_active)];
    assert.equal(await argon2.verify(originalHash,firstPassword),true);

    assert.equal((await provisionAdmin(pool,config)).action,'unchanged');
    const changedInput=adminProvisioningConfig({ADMIN_EMAIL:validEmail,ADMIN_PASSWORD:secondPassword});
    assert.equal((await provisionAdmin(pool,changedInput)).action,'unchanged');
    const[afterRerun]=await pool.execute<RowDataPacket[]>('SELECT email,password_hash,first_name,last_name,is_active FROM users WHERE email=?',[validEmail]);
    assert.equal(String(afterRerun[0]!.password_hash),originalHash);
    assert.deepEqual([afterRerun[0]!.email,afterRerun[0]!.first_name,afterRerun[0]!.last_name,Number(afterRerun[0]!.is_active)],identity);

    const[permissionCounts]=await pool.execute<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM permissions WHERE is_active=TRUE) active_permissions,
      (SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE) assigned_permissions`);
    assert.equal(Number(permissionCounts[0]!.assigned_permissions),Number(permissionCounts[0]!.active_permissions));

    const[agencyRows]=await pool.execute<RowDataPacket[]>('SELECT id FROM agencies ORDER BY id LIMIT 1');
    const ordinaryEmail='ordinary-user@invalid.test';
    const[ordinaryInsert]=await pool.execute<any>(`INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active) VALUES(?,'Ordinary','User',?, 'not-a-real-hash',TRUE)`,[agencyRows[0]!.id,ordinaryEmail]);
    const[falseRoleInsert]=await pool.execute<any>(`INSERT INTO roles(name,code,is_system,is_active) VALUES('Faux Super Admin','SUPER_ADMIN_FAKE_SEED_TEST',FALSE,TRUE)`);
    await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[ordinaryInsert.insertId,falseRoleInsert.insertId]);
    await assert.rejects(()=>provisionAdmin(pool,adminProvisioningConfig({ADMIN_EMAIL:ordinaryEmail,ADMIN_PASSWORD:firstPassword})),/utilisateur non Super Admin système/);
    const[ordinaryRoles]=await pool.execute<RowDataPacket[]>(`SELECT r.code,r.is_system FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=?`,[ordinaryInsert.insertId]);
    assert.deepEqual(ordinaryRoles.map(row=>[row.code,Number(row.is_system)]),[['SUPER_ADMIN_FAKE_SEED_TEST',0]]);

    assert.throws(()=>adminProvisioningConfig({ADMIN_EMAIL:validEmail,ADMIN_PASSWORD:'replace_with_a_strong_initial_password',ADMIN_ROTATE_PASSWORD:'true'}),/ADMIN_PASSWORD/);
    const[beforeRotation]=await pool.execute<RowDataPacket[]>('SELECT password_hash FROM users WHERE email=?',[validEmail]);
    assert.equal(String(beforeRotation[0]!.password_hash),originalHash);

    const rotation=adminProvisioningConfig({ADMIN_EMAIL:validEmail,ADMIN_PASSWORD:secondPassword,ADMIN_ROTATE_PASSWORD:'true'});
    assert.equal((await provisionAdmin(pool,rotation)).action,'password_rotated');
    const[afterRotation]=await pool.execute<RowDataPacket[]>('SELECT password_hash,email,first_name,last_name,is_active FROM users WHERE email=?',[validEmail]);
    assert.notEqual(String(afterRotation[0]!.password_hash),originalHash);
    assert.equal(await argon2.verify(String(afterRotation[0]!.password_hash),secondPassword),true);
    assert.deepEqual([afterRotation[0]!.email,afterRotation[0]!.first_name,afterRotation[0]!.last_name,Number(afterRotation[0]!.is_active)],identity);

    const[systemRoles]=await pool.execute<RowDataPacket[]>(`SELECT code,is_system FROM roles WHERE is_system=TRUE`);
    assert.deepEqual(systemRoles.map(row=>[row.code,Number(row.is_system)]),[['SUPER_ADMIN',1]]);
  }finally{await pool.end()}
});
