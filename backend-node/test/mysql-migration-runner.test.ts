import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import test from 'node:test';
import mysql,{type RowDataPacket} from 'mysql2/promise';
import {bootstrapDatabase} from '../src/scripts/database-bootstrap.js';
import {ensureMigrationStepJournal,executeResilientMigration,historicalMigrationCompatibility,migrationLockName,SimulatedMigrationInterruption,splitSqlStatements} from '../src/scripts/mysql-migration-runner.js';

test('MIG-UNIT découpe les fichiers sans confondre commentaires et points-virgules de chaînes',()=>{
 assert.deepEqual(splitSqlStatements("-- avant\nCREATE TABLE a(id INT); INSERT INTO a VALUES('x;y');"),['CREATE TABLE a(id INT)',"INSERT INTO a VALUES('x;y')"]);
});

test('Runner MySQL 8.4 : un DDL échoué sans effet est corrigeable et reprenable',{skip:!process.env.MIGRATION_MYSQL_TEST,timeout:120_000},async()=>{
 const schema=`lca_migration_safe_${process.pid}`,configuration={host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??''};
 const admin=await mysql.createConnection(configuration);let connection:Awaited<ReturnType<typeof mysql.createConnection>>|undefined;
 try{
  assert.match(schema,/^lca_migration_safe_\d+$/);await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  connection=await mysql.createConnection({...configuration,database:schema});
  await connection.query(`CREATE TABLE schema_migrations(version INT UNSIGNED PRIMARY KEY,name VARCHAR(190) NOT NULL,checksum CHAR(64) NOT NULL,applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`);
  await ensureMigrationStepJournal(connection);
  await assert.rejects(executeResilientMigration(connection,{version:1,name:'001_safe_retry.sql',sql:'CREATE TABLE safe_retry(id INT PRIMARY KEY, absent_id INT, CONSTRAINT fk_safe_retry_absent FOREIGN KEY(absent_id) REFERENCES absent_table(id))'}),/MIGRATION_FAILED_SAFE/);
  const[failed]=await connection.query<RowDataPacket[]>(`SELECT status FROM schema_migration_steps WHERE version=1 AND step_no=1`);assert.equal(failed[0]!.status,'FAILED_SAFE');
  const[absent]=await connection.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='safe_retry'`);assert.equal(Number(absent[0]!.total),0);
  await executeResilientMigration(connection,{version:1,name:'001_safe_retry.sql',sql:'CREATE TABLE safe_retry(id INT PRIMARY KEY, note VARCHAR(80) NOT NULL)'});
  const[applied]=await connection.query<RowDataPacket[]>(`SELECT status FROM schema_migration_steps WHERE version=1 AND step_no=1`);assert.equal(applied[0]!.status,'APPLIED');
  const[history]=await connection.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM schema_migrations WHERE version=1`);assert.equal(Number(history[0]!.total),1);
  assert.equal((await historicalMigrationCompatibility(connection,'-- commentaire modifié\nCREATE TABLE safe_retry(id INT PRIMARY KEY, note VARCHAR(80) NOT NULL)')).compatible,true);
  const significant=await historicalMigrationCompatibility(connection,'CREATE TABLE safe_retry(id INT PRIMARY KEY, note VARCHAR(80) NOT NULL, historical_addition VARCHAR(40) NOT NULL)');assert.equal(significant.compatible,false);assert.deepEqual(significant.incompatibilities,[{step:1,state:'AMBIGUOUS'}]);
 }finally{await connection?.end();await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});

const enabled=process.env.MIGRATION_MYSQL_TEST==='1';
const latestMigrationVersion=124;
test('Runner MySQL 8.4 actuel : fresh, reprise, checksum, conservation et concurrence',{skip:!enabled,timeout:1_200_000},async()=>{
 const prefix=`lca_migration_b31_${process.pid}_`,schemas={fresh:`${prefix}fresh`,before:`${prefix}before`,ddl:`${prefix}ddl`,journal:`${prefix}journal`,checksum:`${prefix}checksum`,concurrent:`${prefix}concurrent`};
 const admin=await mysql.createConnection({host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??'',multipleStatements:true});
 const useEnvironment=(schema:string)=>Object.assign(process.env,{DB_HOST:process.env.MIGRATION_DB_HOST??'127.0.0.1',DB_PORT:process.env.MIGRATION_DB_PORT??'3306',DB_USER:process.env.MIGRATION_DB_USER??'root',DB_PASSWORD:process.env.MIGRATION_DB_PASSWORD??'',DB_NAME:schema,DATABASE_ROOT:resolve(import.meta.dirname,'../database')});
 const create=async(schema:string)=>{assert.match(schema,/^lca_migration_b31_\d+_[a-z]+$/);await admin.query(`DROP DATABASE IF EXISTS \`${schema}\`;CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)};
 const run=async(schema:string,faultHook?:Parameters<typeof bootstrapDatabase>[0]['faultHook'])=>{useEnvironment(schema);return bootstrapDatabase({faultHook})};
 const crash=(phase:string,version:number,step?:number)=>async(event:{phase:string;version:number;step:number})=>{if(event.phase===phase&&event.version===version&&(step==null||event.step===step))throw new SimulatedMigrationInterruption('coupure B31 simulée')};
 try{
  for(const schema of Object.values(schemas))await create(schema);
  assert.equal((await run(schemas.fresh)).version,latestMigrationVersion);assert.equal((await run(schemas.fresh)).version,latestMigrationVersion);
  await admin.query(`USE \`${schemas.fresh}\`;INSERT INTO groups_company(name,code) VALUES('Préservé B31','PRESERVED_B31')`);assert.equal((await run(schemas.fresh)).version,latestMigrationVersion);const[preserved]=await admin.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM \`${schemas.fresh}\`.groups_company WHERE code='PRESERVED_B31'`);assert.equal(Number(preserved[0]!.total),1);
  await assert.rejects(run(schemas.before,crash('before-step',72,1)),SimulatedMigrationInterruption);assert.equal((await run(schemas.before)).version,latestMigrationVersion);
  await assert.rejects(run(schemas.ddl,crash('after-statement-before-journal',80,1)),SimulatedMigrationInterruption);assert.equal((await run(schemas.ddl)).version,latestMigrationVersion);
  await assert.rejects(run(schemas.journal,crash('before-migration-journal',85)),SimulatedMigrationInterruption);assert.equal((await run(schemas.journal)).version,latestMigrationVersion);
  assert.equal((await run(schemas.checksum)).version,latestMigrationVersion);await admin.execute(`UPDATE \`${schemas.checksum}\`.schema_migrations SET checksum=REPEAT('f',64) WHERE version=85`);const drifted=await run(schemas.checksum);assert.equal(drifted.version,latestMigrationVersion);assert.match(drifted.warnings.join('\n'),/MIGRATION_CHECKSUM_WARNING: 085_treasury_account_attachment\.sql/);
  useEnvironment(schemas.concurrent);const concurrent=await Promise.all([bootstrapDatabase(),bootstrapDatabase()]);assert.deepEqual(concurrent.map(x=>x.version),[latestMigrationVersion,latestMigrationVersion]);const[rows]=await admin.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM \`${schemas.concurrent}\`.schema_migrations WHERE version=?`,[latestMigrationVersion]);assert.equal(Number(rows[0]!.total),1);const[locks]=await admin.query<RowDataPacket[]>('SELECT IS_FREE_LOCK(?) free',[migrationLockName(schemas.concurrent)]);assert.equal(Number(locks[0]!.free),1);
 }finally{for(const schema of Object.values(schemas))await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});
