import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import test from 'node:test';
import mysql,{type RowDataPacket} from 'mysql2/promise';
import {ensureMigrationStepJournal,executeResilientMigration} from '../src/scripts/mysql-migration-runner.js';

const enabled=process.env.MIGRATION_085_MYSQL_TEST==='1';

test('MIG085 — exécution réelle MySQL 8.4 et invariants historiques',{skip:!enabled,timeout:120_000},async()=>{
  const schema=`lca_migration_085_${process.pid}`;
  assert.match(schema,/^lca_migration_085_\d+$/);
  const admin=await mysql.createConnection({
    host:process.env.MIGRATION_DB_HOST??'127.0.0.1',
    port:Number(process.env.MIGRATION_DB_PORT??3306),
    user:process.env.MIGRATION_DB_USER??'root',
    password:process.env.MIGRATION_DB_PASSWORD??'',
    multipleStatements:true,
  });
  try{
    await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await admin.query(`USE \`${schema}\``);
    await admin.query(`CREATE TABLE concessions(id BIGINT UNSIGNED PRIMARY KEY);CREATE TABLE agencies(id BIGINT UNSIGNED PRIMARY KEY,concession_id BIGINT UNSIGNED NOT NULL,CONSTRAINT fk_a_c FOREIGN KEY(concession_id) REFERENCES concessions(id));CREATE TABLE users(id BIGINT UNSIGNED PRIMARY KEY);CREATE TABLE treasury_accounts(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,concession_id BIGINT UNSIGNED NOT NULL,agency_id BIGINT UNSIGNED NULL,code VARCHAR(50) NOT NULL,name VARCHAR(150) NOT NULL,description VARCHAR(1000) NULL,account_type ENUM('CASH','BANK','OTHER') NOT NULL,currency_code CHAR(3) NOT NULL,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_by BIGINT UNSIGNED NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_treasury_account_code(concession_id,code),KEY idx_treasury_account_scope(concession_id,agency_id,is_active),CONSTRAINT fk_ta_c FOREIGN KEY(concession_id) REFERENCES concessions(id),CONSTRAINT fk_ta_a FOREIGN KEY(agency_id) REFERENCES agencies(id),CONSTRAINT fk_ta_u FOREIGN KEY(created_by) REFERENCES users(id));CREATE TABLE untouched(id INT PRIMARY KEY,note VARCHAR(20));CREATE TABLE schema_migrations(version INT UNSIGNED PRIMARY KEY,name VARCHAR(190),checksum CHAR(64));`);
    await ensureMigrationStepJournal(admin);
    await admin.query(`INSERT INTO concessions VALUES(1),(2);INSERT INTO agencies VALUES(10,1),(20,2);INSERT INTO users VALUES(1);INSERT INTO treasury_accounts(concession_id,agency_id,code,name,account_type,currency_code,created_by) VALUES(1,10,'AG','Agence','CASH','XAF',1),(1,NULL,'AMB','Ambigu','BANK','XAF',1);INSERT INTO untouched VALUES(1,'avant')`);
    const sql=await readFile(resolve(import.meta.dirname,'../database/migrations/085_treasury_account_attachment.sql'),'utf8');
    await executeResilientMigration(admin,{version:85,name:'085_treasury_account_attachment.sql',sql});
    const[accounts]=await admin.query<RowDataPacket[]>('SELECT code,agency_id,attachment_type FROM treasury_accounts ORDER BY code');
    assert.deepEqual(accounts.map(x=>[x.code,x.agency_id==null?null:Number(x.agency_id),x.attachment_type]),[['AG',10,'AGENCY'],['AMB',null,null]]);
    const[indexes]=await admin.query<RowDataPacket[]>(`SELECT index_name FROM information_schema.statistics WHERE table_schema=? AND table_name='treasury_accounts' AND index_name='idx_treasury_account_attachment'`,[schema]);
    assert.equal(indexes.length,4);
    const[constraints]=await admin.query<RowDataPacket[]>(`SELECT constraint_name FROM information_schema.table_constraints WHERE constraint_schema=? AND table_name='treasury_accounts' AND constraint_name='chk_treasury_account_attachment'`,[schema]);
    assert.equal(constraints.length,1);
    await assert.rejects(admin.execute("UPDATE treasury_accounts SET attachment_type='CONCESSION' WHERE code='AG'"));
    await admin.execute("INSERT INTO treasury_accounts(concession_id,agency_id,attachment_type,code,name,account_type,currency_code,created_by) VALUES(1,10,'AGENCY','NEW_AG','Agence neuve','CASH','XAF',1),(1,NULL,'CONCESSION','NEW_CO','Central','BANK','XAF',1)");
    const[untouched]=await admin.query<RowDataPacket[]>('SELECT * FROM untouched');
    assert.deepEqual(untouched.map(x=>[Number(x.id),x.note]),[[1,'avant']]);
    const[versions]=await admin.query<RowDataPacket[]>('SELECT version,name FROM schema_migrations');
    assert.deepEqual(versions.map(x=>[Number(x.version),x.name]),[[85,'085_treasury_account_attachment.sql']]);
  }finally{
    await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await admin.end();
  }
});
