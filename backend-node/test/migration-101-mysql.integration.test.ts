import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{resolve}from'node:path';
import test from'node:test';
import mysql,{type RowDataPacket}from'mysql2/promise';
import{ensureMigrationStepJournal,executeResilientMigration}from'../src/scripts/mysql-migration-runner.js';

const enabled=process.env.MIGRATION_101_MYSQL_TEST==='1';

test('MIG101 — schéma financier prestataires et reprise MySQL 8.4',{skip:!enabled,timeout:120_000},async()=>{
 const schema=`lca_migration_101_${process.pid}`,admin=await mysql.createConnection({host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??'',multipleStatements:true});
 try{
  await admin.query(`CREATE DATABASE \`${schema}\`;USE \`${schema}\`;
   CREATE TABLE users(id BIGINT UNSIGNED PRIMARY KEY);
   CREATE TABLE roles(id BIGINT UNSIGNED PRIMARY KEY,code VARCHAR(80),is_system BOOLEAN,is_active BOOLEAN);
   CREATE TABLE permissions(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,module VARCHAR(80),action VARCHAR(80),code VARCHAR(120) UNIQUE,name VARCHAR(190),label VARCHAR(190),group_name VARCHAR(120),description VARCHAR(1000),is_active BOOLEAN);
   CREATE TABLE role_permissions(role_id BIGINT UNSIGNED,permission_id BIGINT UNSIGNED,scope ENUM('OWN','AGENCY','CONCESSION','GLOBAL'),PRIMARY KEY(role_id,permission_id));
   CREATE TABLE provider_profiles(id BIGINT UNSIGNED PRIMARY KEY);
   CREATE TABLE budget_expenses(id BIGINT UNSIGNED PRIMARY KEY);
   CREATE TABLE provider_remunerations(id BIGINT UNSIGNED PRIMARY KEY,currency CHAR(3) NOT NULL DEFAULT 'XAF');
   CREATE TABLE budget_expense_disbursements(id BIGINT UNSIGNED PRIMARY KEY);
   CREATE TABLE document_types(id BIGINT UNSIGNED PRIMARY KEY);
   CREATE TABLE schema_migrations(version INT UNSIGNED PRIMARY KEY,name VARCHAR(190),checksum CHAR(64));
   INSERT INTO users VALUES(1),(2);INSERT INTO roles VALUES(1,'SUPER_ADMIN',TRUE,TRUE);INSERT INTO provider_profiles VALUES(10);INSERT INTO budget_expenses VALUES(20);INSERT INTO provider_remunerations VALUES(30,'XAF');INSERT INTO budget_expense_disbursements VALUES(40);INSERT INTO document_types VALUES(50);`);
  await ensureMigrationStepJournal(admin);const sql=await readFile(resolve(import.meta.dirname,'../database/migrations/101_provider_remuneration_finance.sql'),'utf8');
  await executeResilientMigration(admin,{version:101,name:'101_provider_remuneration_finance.sql',sql});
  await admin.execute("INSERT INTO provider_payment_instruments(provider_profile_id,instrument_type,label,encrypted_payload,payload_iv,payload_tag,key_version,masked_reference,created_by)VALUES(10,'BANK_TRANSFER','Banque','cipher','iv','tag','v1','****1234',1)");
  const[instruments]=await admin.query<RowDataPacket[]>('SELECT instrument_type,masked_reference FROM provider_payment_instruments');assert.deepEqual([instruments[0]!.instrument_type,instruments[0]!.masked_reference],['BANK_TRANSFER','****1234']);
  await assert.rejects(admin.execute("INSERT INTO provider_payment_instruments(provider_profile_id,instrument_type,label,created_by)VALUES(10,'BANK_TRANSFER','Invalide',1)"));
  await admin.execute('UPDATE provider_remunerations SET budget_expense_id=20 WHERE id=30');await assert.rejects(admin.execute("INSERT INTO provider_remunerations(id,currency,budget_expense_id)VALUES(31,'XAF',20)"));
  const[perms]=await admin.query<RowDataPacket[]>("SELECT COUNT(*) total FROM permissions WHERE code LIKE 'hr.provider.%'");assert.equal(Number(perms[0]!.total),5);
  const[recorded]=await admin.query<RowDataPacket[]>('SELECT COUNT(*) total FROM schema_migrations WHERE version=101');assert.equal(Number(recorded[0]!.total),1);
  const[preserved]=await admin.query<RowDataPacket[]>('SELECT COUNT(*) total FROM provider_payment_instruments');assert.equal(Number(preserved[0]!.total),1);
 }finally{await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});
