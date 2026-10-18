import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import test from 'node:test';
import mysql,{type RowDataPacket} from 'mysql2/promise';
import {bootstrapDatabase} from '../src/scripts/database-bootstrap.js';
import {migrationLockName,SimulatedMigrationInterruption,splitSqlStatements} from '../src/scripts/mysql-migration-runner.js';

test('MIG-UNIT découpe les fichiers sans confondre commentaires et points-virgules de chaînes',()=>{
 assert.deepEqual(splitSqlStatements("-- avant\nCREATE TABLE a(id INT); INSERT INTO a VALUES('x;y');"),['CREATE TABLE a(id INT)',"INSERT INTO a VALUES('x;y')"]);
});

const enabled=process.env.MIGRATION_MYSQL_TEST==='1';
test('Runner MySQL 8.4 actuel : fresh, reprise, checksum, conservation et concurrence',{skip:!enabled,timeout:900_000},async()=>{
 const prefix=`lca_migration_b31_${process.pid}_`,schemas={fresh:`${prefix}fresh`,before:`${prefix}before`,ddl:`${prefix}ddl`,journal:`${prefix}journal`,checksum:`${prefix}checksum`,concurrent:`${prefix}concurrent`};
 const admin=await mysql.createConnection({host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??'',multipleStatements:true});
 const useEnvironment=(schema:string)=>Object.assign(process.env,{DB_HOST:process.env.MIGRATION_DB_HOST??'127.0.0.1',DB_PORT:process.env.MIGRATION_DB_PORT??'3306',DB_USER:process.env.MIGRATION_DB_USER??'root',DB_PASSWORD:process.env.MIGRATION_DB_PASSWORD??'',DB_NAME:schema,DATABASE_ROOT:resolve(import.meta.dirname,'../database')});
 const create=async(schema:string)=>{assert.match(schema,/^lca_migration_b31_\d+_[a-z]+$/);await admin.query(`DROP DATABASE IF EXISTS \`${schema}\`;CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)};
 const run=async(schema:string,faultHook?:Parameters<typeof bootstrapDatabase>[0]['faultHook'])=>{useEnvironment(schema);return bootstrapDatabase({faultHook})};
 const crash=(phase:string,version:number,step?:number)=>async(event:{phase:string;version:number;step:number})=>{if(event.phase===phase&&event.version===version&&(step==null||event.step===step))throw new SimulatedMigrationInterruption('coupure B31 simulée')};
 try{
  for(const schema of Object.values(schemas))await create(schema);
  assert.equal((await run(schemas.fresh)).version,91);assert.equal((await run(schemas.fresh)).version,91);
  await admin.query(`USE \`${schemas.fresh}\`;INSERT INTO groups_company(name,code) VALUES('Préservé B31','PRESERVED_B31')`);assert.equal((await run(schemas.fresh)).version,91);const[preserved]=await admin.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM \`${schemas.fresh}\`.groups_company WHERE code='PRESERVED_B31'`);assert.equal(Number(preserved[0]!.total),1);
  await assert.rejects(run(schemas.before,crash('before-step',72,1)),SimulatedMigrationInterruption);assert.equal((await run(schemas.before)).version,91);
  await assert.rejects(run(schemas.ddl,crash('after-statement-before-journal',80,1)),SimulatedMigrationInterruption);assert.equal((await run(schemas.ddl)).version,91);
  await assert.rejects(run(schemas.journal,crash('before-migration-journal',85)),SimulatedMigrationInterruption);assert.equal((await run(schemas.journal)).version,91);
  assert.equal((await run(schemas.checksum)).version,91);await admin.execute(`UPDATE \`${schemas.checksum}\`.schema_migrations SET checksum=REPEAT('f',64) WHERE version=85`);await assert.rejects(run(schemas.checksum),/MIGRATION_CHECKSUM_MISMATCH: 085_treasury_account_attachment\.sql/);
  useEnvironment(schemas.concurrent);const concurrent=await Promise.all([bootstrapDatabase(),bootstrapDatabase()]);assert.deepEqual(concurrent.map(x=>x.version),[91,91]);const[rows]=await admin.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM \`${schemas.concurrent}\`.schema_migrations WHERE version=91`);assert.equal(Number(rows[0]!.total),1);const[locks]=await admin.query<RowDataPacket[]>('SELECT IS_FREE_LOCK(?) free',[migrationLockName(schemas.concurrent)]);assert.equal(Number(locks[0]!.free),1);
 }finally{for(const schema of Object.values(schemas))await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});
