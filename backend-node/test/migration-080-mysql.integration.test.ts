import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import test from 'node:test';
import mysql,{type Connection, type RowDataPacket} from 'mysql2/promise';
import {bootstrapDatabase} from '../src/scripts/database-bootstrap.js';
import {ensureMigrationStepJournal,migrationChecksum,SimulatedMigrationInterruption} from '../src/scripts/mysql-migration-runner.js';

const enabled=process.env.MIGRATION_080_MYSQL_TEST==='1',root=resolve(import.meta.dirname,'..');
const versionOf=(name:string)=>Number(name.slice(0,3));

test('M080 MySQL 8.4: 079, reprise, divergence et données',{skip:!enabled,timeout:900_000},async()=>{
 const admin=await mysql.createConnection({host:process.env.MIGRATION_DB_HOST,port:Number(process.env.MIGRATION_DB_PORT),user:process.env.MIGRATION_DB_USER,password:process.env.MIGRATION_DB_PASSWORD,multipleStatements:true});
 const open=new Set<Connection>();
 const suffix=randomUUID().replaceAll('-','').slice(0,10),schemas=['from079','partial','existing','diverged'].map(x=>`lca_m080_${x}_${suffix}`);
 const baseline=await readFile(resolve(root,'database/baseline/001_initial_schema.sql'),'utf8'),seed=await readFile(resolve(root,'database/seeds/001_system_seed.sql'),'utf8'),names=(await readdir(resolve(root,'database/migrations'))).filter(x=>/^0(?:7[2-9]|80)_.*\.sql$/.test(x)).sort();
 const prepare079=async(schema:string)=>{await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);const c=await mysql.createConnection({host:process.env.MIGRATION_DB_HOST,port:Number(process.env.MIGRATION_DB_PORT),user:process.env.MIGRATION_DB_USER,password:process.env.MIGRATION_DB_PASSWORD,database:schema,multipleStatements:true});open.add(c);await c.query(baseline);await c.query(seed);await ensureMigrationStepJournal(c);for(const name of names.filter(x=>versionOf(x)<=79)){const sql=await readFile(resolve(root,'database/migrations',name),'utf8');await c.query(sql);await c.execute('INSERT INTO schema_migrations(version,name,checksum) VALUES(?,?,?)',[versionOf(name),name,migrationChecksum(sql)])}return c};
 const run=async(schema:string,faultHook?:Parameters<typeof bootstrapDatabase>[0]['faultHook'])=>{Object.assign(process.env,{DB_HOST:process.env.MIGRATION_DB_HOST,DB_PORT:process.env.MIGRATION_DB_PORT,DB_USER:process.env.MIGRATION_DB_USER,DB_PASSWORD:process.env.MIGRATION_DB_PASSWORD,DB_NAME:schema,DATABASE_ROOT:resolve(root,'database')});return bootstrapDatabase({faultHook})};
 const assert080=async(c:Connection)=>{const[version]=await c.execute<RowDataPacket[]>('SELECT COUNT(*) total FROM schema_migrations WHERE version=80'),[steps]=await c.execute<RowDataPacket[]>("SELECT COUNT(*) total,SUM(status='APPLIED') applied FROM schema_migration_steps WHERE version=80"),[column]=await c.execute<RowDataPacket[]>("SELECT column_type,is_nullable FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='document_mark_snapshots' AND column_name='document_context'"),[fks]=await c.execute<RowDataPacket[]>("SELECT COUNT(*) total FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND constraint_name IN('fk_service_stamp_category','fk_stamp_role_stamp','fk_document_policy_default_stamp','fk_document_mark_policy')");assert.equal(Number(version[0]!.total),1);assert.equal(Number(steps[0]!.total),6);assert.equal(Number(steps[0]!.applied),6);assert.equal(String(column[0]!.COLUMN_TYPE??column[0]!.column_type),'varchar(50)');assert.equal(String(column[0]!.IS_NULLABLE??column[0]!.is_nullable),'NO');assert.equal(Number(fks[0]!.total),4)};
 try{
  const from079=await prepare079(schemas[0]!);const[concession]=await from079.execute<any>("INSERT INTO concessions(name,code) VALUES('M080','M080')"),[agency]=await from079.execute<any>("INSERT INTO agencies(concession_id,name,code) VALUES(?,'M080','M080A')",[concession.insertId]),[user]=await from079.execute<any>("INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,'M','080',?,'x')",[agency.insertId,`m080-${suffix}@test.local`]),[stamp]=await from079.execute<any>("INSERT INTO service_stamps(concession_id,agency_id,name,document_context,created_by) VALUES(?,?,'Historique','DELIVERY_REPORT',?)",[concession.insertId,agency.insertId,user.insertId]);await run(schemas[0]!);await assert080(from079);const[data]=await from079.execute<RowDataPacket[]>('SELECT name,document_context,category_id FROM service_stamps WHERE id=?',[stamp.insertId]);assert.equal(data[0]!.name,'Historique');assert.equal(data[0]!.document_context,'DELIVERY_REPORT');assert.equal(data[0]!.category_id,null);await from079.end();

  const partial=await prepare079(schemas[1]!);await assert.rejects(run(schemas[1]!,async e=>{if(e.version===80&&e.step===3&&e.phase==='after-statement-before-journal')throw new SimulatedMigrationInterruption('M080 coupure') }),SimulatedMigrationInterruption);await run(schemas[1]!);await assert080(partial);await partial.end();

  const existing=await prepare079(schemas[2]!);await run(schemas[2]!);await existing.execute('DELETE FROM schema_migrations WHERE version=80');await run(schemas[2]!);await assert080(existing);await existing.end();

  const diverged=await prepare079(schemas[3]!);await run(schemas[3]!);await diverged.execute('DELETE FROM schema_migrations WHERE version=80');await diverged.execute('ALTER TABLE document_mark_snapshots MODIFY document_context VARCHAR(40) NOT NULL');await assert.rejects(run(schemas[3]!),/MIGRATION_SCHEMA_DIVERGED: 080_document_mark_policies\.sql étape 3/);await diverged.end();
 }finally{for(const c of open)await c.end().catch(()=>undefined);for(const schema of schemas)await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});
