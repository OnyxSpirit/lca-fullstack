import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import argon2 from 'argon2';
import mysql, {type RowDataPacket} from 'mysql2/promise';

const database=process.env.QUALIFICATION_DB_NAME;
assert.equal(database,'lca_qualification_finale_v2','La recette doit cibler exclusivement la base isolée finale');

const pool=mysql.createPool({
  host:process.env.QUALIFICATION_DB_HOST??'127.0.0.1',
  port:Number(process.env.QUALIFICATION_DB_PORT??33321),
  user:process.env.QUALIFICATION_DB_USER,
  password:process.env.QUALIFICATION_DB_PASSWORD,
  database,
  connectionLimit:2,
});

const ids:{concession?:number;agencyA?:number;agencyB?:number;ownUser?:number;agencyUser?:number;ownRole?:number;agencyRole?:number}={};
const one=async(sql:string,params:unknown[]=[])=>{
  const[rows]=await pool.execute<RowDataPacket[]>(sql,params);
  assert.ok(rows[0],`Ligne attendue: ${sql}`);
  return rows[0];
};

before(async()=>{
  const hash=await argon2.hash('Qualification!2026');
  await pool.execute("INSERT INTO concessions(name,code,legal_name,country) VALUES('Qualification Finale LCA','QF_LCA','Qualification Finale LCA SARL','Congo') ON DUPLICATE KEY UPDATE name=VALUES(name)");
  ids.concession=Number((await one("SELECT id FROM concessions WHERE code='QF_LCA'")).id);
  await pool.execute("INSERT INTO agencies(concession_id,name,code,city,email) VALUES(?, 'Agence Qualification Alpha','QF_ALPHA','Brazzaville','alpha@qualification.invalid'),(?, 'Agence Qualification Bêta','QF_BETA','Pointe-Noire','beta@qualification.invalid') ON DUPLICATE KEY UPDATE name=VALUES(name),concession_id=VALUES(concession_id)",[ids.concession,ids.concession]);
  ids.agencyA=Number((await one("SELECT id FROM agencies WHERE code='QF_ALPHA'")).id);
  ids.agencyB=Number((await one("SELECT id FROM agencies WHERE code='QF_BETA'")).id);
  await pool.execute("INSERT INTO roles(name,code,description) VALUES('Qualification propriétaire','QF_OWN','Rôle de recette OWN'),('Qualification agence','QF_AGENCY','Rôle de recette AGENCY') ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description)");
  ids.ownRole=Number((await one("SELECT id FROM roles WHERE code='QF_OWN'")).id);
  ids.agencyRole=Number((await one("SELECT id FROM roles WHERE code='QF_AGENCY'")).id);
  await pool.execute("INSERT INTO role_permissions(role_id,permission_id,scope) SELECT ?,id,'OWN' FROM permissions WHERE code IN('customers.view','customers.create','dashboard.view') ON DUPLICATE KEY UPDATE scope=VALUES(scope)",[ids.ownRole]);
  await pool.execute("INSERT INTO role_permissions(role_id,permission_id,scope) SELECT ?,id,'AGENCY' FROM permissions WHERE code IN('customers.view','customers.create','dashboard.view') ON DUPLICATE KEY UPDATE scope=VALUES(scope)",[ids.agencyRole]);
  await pool.execute("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,job_title) VALUES(?,'Olivier','Propriétaire','qf.own@qualification.invalid',?,'Commercial OWN'),(?,'Aline','Agence','qf.agency@qualification.invalid',?,'Responsable AGENCY') ON DUPLICATE KEY UPDATE agency_id=VALUES(agency_id),password_hash=VALUES(password_hash),is_active=TRUE",[ids.agencyA,hash,ids.agencyA,hash]);
  ids.ownUser=Number((await one("SELECT id FROM users WHERE email='qf.own@qualification.invalid'")).id);
  ids.agencyUser=Number((await one("SELECT id FROM users WHERE email='qf.agency@qualification.invalid'")).id);
  await pool.execute('INSERT IGNORE INTO user_roles(user_id,role_id) VALUES(?,?),(?,?)',[ids.ownUser,ids.ownRole,ids.agencyUser,ids.agencyRole]);
  await pool.execute("INSERT INTO user_agencies(user_id,agency_id,is_primary,status) VALUES(?,?,TRUE,'ACTIVE'),(?,?,TRUE,'ACTIVE'),(?,?,FALSE,'ACTIVE') ON DUPLICATE KEY UPDATE status='ACTIVE'",[ids.ownUser,ids.agencyA,ids.agencyUser,ids.agencyA,ids.agencyUser,ids.agencyB]);
  const uaOwn=Number((await one('SELECT id FROM user_agencies WHERE user_id=? AND agency_id=?',[ids.ownUser,ids.agencyA])).id);
  const uaAgencyA=Number((await one('SELECT id FROM user_agencies WHERE user_id=? AND agency_id=?',[ids.agencyUser,ids.agencyA])).id);
  const uaAgencyB=Number((await one('SELECT id FROM user_agencies WHERE user_id=? AND agency_id=?',[ids.agencyUser,ids.agencyB])).id);
  await pool.execute('INSERT IGNORE INTO user_agency_roles(user_agency_id,role_id) VALUES(?,?),(?,?),(?,?)',[uaOwn,ids.ownRole,uaAgencyA,ids.agencyRole,uaAgencyB,ids.agencyRole]);
  await pool.execute("INSERT INTO customers(customer_code,agency_id,first_name,last_name,email,assigned_user_id,created_by) VALUES('QF-CUST-OWN-A',?,'Client','Propre','qf.customer.own@qualification.invalid',?,?),('QF-CUST-OTHER-A',?,'Client','Collègue','qf.customer.peer@qualification.invalid',?,?),('QF-CUST-B',?,'Client','Bêta','qf.customer.beta@qualification.invalid',?,?) ON DUPLICATE KEY UPDATE agency_id=VALUES(agency_id),assigned_user_id=VALUES(assigned_user_id)",[ids.agencyA,ids.ownUser,ids.ownUser,ids.agencyA,ids.agencyUser,ids.agencyUser,ids.agencyB,ids.agencyUser,ids.agencyUser]);
});

after(async()=>pool.end());

test('QF-DB-01 la base fraîche est au niveau 132 sans étape en échec',async()=>{
  const migration=await one("SELECT MAX(version) version,COUNT(*) total FROM schema_migrations");
  const failed=await one("SELECT COUNT(*) total FROM schema_migration_steps WHERE status<>'APPLIED'");
  assert.equal(Number(migration.version),132);
  assert.equal(Number(migration.total),62);
  assert.equal(Number(failed.total),0);
});

test('QF-DB-02 seuls OWN et AGENCY sont persistables',async()=>{
  const column=await one("SELECT column_type,is_nullable FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='role_permissions' AND column_name='scope'");
  assert.equal(column.COLUMN_TYPE,"enum('OWN','AGENCY')");
  assert.equal(column.IS_NULLABLE,'NO');
  await assert.rejects(pool.execute("INSERT INTO role_permissions(role_id,permission_id,scope) SELECT ?,id,'GLOBAL' FROM permissions WHERE code='customers.view'",[ids.ownRole]),/Data truncated|constraint|Incorrect/i);
});

test('QF-DB-03 les fixtures sont multi-agences, fictives et sans collision',async()=>{
  const topology=await one("SELECT COUNT(DISTINCT a.id) agencies,COUNT(DISTINCT u.id) users FROM agencies a JOIN user_agencies ua ON ua.agency_id=a.id JOIN users u ON u.id=ua.user_id WHERE a.code LIKE 'QF_%'");
  assert.equal(Number(topology.agencies),2);
  assert.equal(Number(topology.users),2);
  const realDomains=await one("SELECT COUNT(*) total FROM users WHERE email LIKE 'qf.%@qualification.invalid'");
  assert.equal(Number(realDomains.total),2);
});

test('QF-DB-04 OWN et AGENCY produisent des ensembles différents et bornés',async()=>{
  const own=await one('SELECT COUNT(*) total FROM customers WHERE agency_id=? AND assigned_user_id=?',[ids.agencyA,ids.ownUser]);
  const agency=await one('SELECT COUNT(*) total FROM customers WHERE agency_id=?',[ids.agencyA]);
  const otherAgency=await one('SELECT COUNT(*) total FROM customers WHERE agency_id=?',[ids.agencyB]);
  assert.equal(Number(own.total),1);
  assert.equal(Number(agency.total),2);
  assert.equal(Number(otherAgency.total),1);
});
