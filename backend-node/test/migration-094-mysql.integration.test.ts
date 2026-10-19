import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{resolve}from'node:path';
import test from'node:test';
import mysql,{type RowDataPacket}from'mysql2/promise';
import{ddlState,ensureMigrationStepJournal,executeResilientMigration,splitSqlStatements}from'../src/scripts/mysql-migration-runner.js';

const enabled=process.env.MIGRATION_094_MYSQL_TEST==='1';

test('MIG094 — snapshots historiques, reprise et divergence MySQL 8.4',{skip:!enabled,timeout:120_000},async()=>{
  const schema=`lca_migration_094_${process.pid}`;
  const admin=await mysql.createConnection({host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??'',multipleStatements:true});
  try{
    await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;USE \`${schema}\`;CREATE TABLE agencies(id BIGINT UNSIGNED PRIMARY KEY,name VARCHAR(150) NOT NULL);CREATE TABLE users(id BIGINT UNSIGNED PRIMARY KEY,first_name VARCHAR(100) NOT NULL,last_name VARCHAR(100) NOT NULL);CREATE TABLE notifications(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NULL,event_key VARCHAR(190) NULL,message TEXT NOT NULL,CONSTRAINT fk_n_u FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL);CREATE TABLE schema_migrations(version INT UNSIGNED PRIMARY KEY,name VARCHAR(190),checksum CHAR(64));INSERT INTO agencies VALUES(10,'Agence historique');INSERT INTO users VALUES(1,'Alice','Ancien nom'),(2,'Bob','Destinataire');INSERT INTO notifications(user_id,event_key,message) VALUES(2,'legacy','préservée')`);
    await ensureMigrationStepJournal(admin);
    const sql=await readFile(resolve(import.meta.dirname,'../database/migrations/094_notification_historical_context.sql'),'utf8');
    await executeResilientMigration(admin,{version:94,name:'094_notification_historical_context.sql',sql});
    const[legacy]=await admin.query<RowDataPacket[]>("SELECT message,actor_type,actor_user_id,operation_agency_id FROM notifications WHERE event_key='legacy'");
    assert.deepEqual([legacy[0]!.message,legacy[0]!.actor_type,legacy[0]!.actor_user_id,legacy[0]!.operation_agency_id],['préservée','UNKNOWN',null,null]);
    await admin.execute("INSERT INTO notifications(user_id,event_key,message,actor_type,actor_user_id,actor_display_name_snapshot,operation_agency_id,operation_agency_name_snapshot) VALUES(2,'new','figée','HUMAN',1,'Alice Ancien nom',10,'Agence historique')");
    await admin.execute("UPDATE users SET first_name='Alicia' WHERE id=1");await admin.execute("UPDATE agencies SET name='Agence renommée' WHERE id=10");
    const[snapshot]=await admin.query<RowDataPacket[]>("SELECT actor_display_name_snapshot,operation_agency_name_snapshot FROM notifications WHERE event_key='new'");
    assert.deepEqual([snapshot[0]!.actor_display_name_snapshot,snapshot[0]!.operation_agency_name_snapshot],['Alice Ancien nom','Agence historique']);
    const[statement]=splitSqlStatements(sql);assert.equal(await ddlState(admin,statement!),'SATISFIED');
    await admin.execute("ALTER TABLE notifications MODIFY actor_display_name_snapshot VARCHAR(190) NULL");
    assert.equal(await ddlState(admin,statement!),'AMBIGUOUS');
  }finally{await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});
