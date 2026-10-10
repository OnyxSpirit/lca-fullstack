import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import test from 'node:test';
import mysql,{type Connection,type RowDataPacket} from 'mysql2/promise';
import {bootstrapDatabase} from '../src/scripts/database-bootstrap.js';
import {migrationChecksum,migrationLockName,SimulatedMigrationInterruption,splitSqlStatements} from '../src/scripts/mysql-migration-runner.js';

test('MIG-UNIT découpe les fichiers sans confondre commentaires et points-virgules de chaînes',()=>{
  assert.deepEqual(splitSqlStatements("-- avant\nCREATE TABLE a(id INT); INSERT INTO a VALUES('x;y');"),['CREATE TABLE a(id INT)',"INSERT INTO a VALUES('x;y')"]);
});

const enabled=process.env.MIGRATION_MYSQL_TEST==='1';
test('M1-M18 et M45-1–M45-10 runner MySQL 8.4 résilient',{skip:!enabled,timeout:900_000},async()=>{
  const prefix='lca_migration_audit_',root=resolve(import.meta.dirname,'..'),schemas={fresh:`${prefix}fresh`,historical:`${prefix}historical`,before:`${prefix}before`,ddl:`${prefix}ddl`,middle:`${prefix}middle`,journal:`${prefix}journal`,mixed:`${prefix}mixed`,emailConflict:`${prefix}emailconflict`,phoneConflict:`${prefix}phoneconflict`,m45before:`${prefix}migrationbefore`,m45ddl:`${prefix}migrationddl`,ambiguous:`${prefix}ambiguous`,concurrent:`${prefix}concurrent`};
  const admin=await mysql.createConnection({host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??'',multipleStatements:true});
  const baseline=await readFile(resolve(root,'database/baseline/001_initial_schema.sql'),'utf8'),seed=await readFile(resolve(root,'database/seeds/001_system_seed.sql'),'utf8');
  const names=Object.values(schemas);for(const schema of names)assert.match(schema,/^lca_migration_audit_[a-z]+$/);
  const selectSchema=async(schema:string)=>{await admin.query(`DROP DATABASE IF EXISTS \`${schema}\`; CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE \`${schema}\``)};
  const initializeLevel40=async(schema:string)=>{await selectSchema(schema);await admin.query(baseline);await admin.query(seed)};
  const useEnvironment=(schema:string)=>{Object.assign(process.env,{DB_HOST:process.env.MIGRATION_DB_HOST??'127.0.0.1',DB_PORT:process.env.MIGRATION_DB_PORT??'3306',DB_USER:process.env.MIGRATION_DB_USER??'root',DB_PASSWORD:process.env.MIGRATION_DB_PASSWORD??'',DB_NAME:schema,DATABASE_ROOT:resolve(root,'database')})};
  const run=async(schema:string,faultHook?:Parameters<typeof bootstrapDatabase>[0]['faultHook'])=>{useEnvironment(schema);return bootstrapDatabase({faultHook})};
  const versions=async(schema:string)=>{await admin.query(`USE \`${schema}\``);const[rows]=await admin.query<RowDataPacket[]>('SELECT version,name FROM schema_migrations ORDER BY version');return rows};
  const schemaSignature=async(schema:string)=>{await admin.query(`USE \`${schema}\``);const[tables]=await admin.query<RowDataPacket[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' AND table_name NOT IN('schema_migrations','schema_migration_steps') ORDER BY table_name`,[schema]);const creates=[];for(const row of tables){const[definition]=await admin.query<RowDataPacket[]>(`SHOW CREATE TABLE \`${String(row.TABLE_NAME??row.table_name)}\``);creates.push(String(Object.values(definition[0]!)[1]).replace(/AUTO_INCREMENT=\d+\s*/g,''))}return creates};
  const crash=(phase:string,version:number,step?:number)=>async(event:{phase:string;version:number;step:number})=>{if(event.phase===phase&&event.version===version&&(step==null||event.step===step))throw new SimulatedMigrationInterruption('coupure simulée')};
  try{
    await selectSchema(schemas.fresh);assert.equal((await run(schemas.fresh)).version,45);assert.deepEqual((await versions(schemas.fresh)).map(row=>Number(row.version)),[40,41,42,43,44,45]);assert.equal((await run(schemas.fresh)).version,45);

    await initializeLevel40(schemas.historical);await admin.execute('DELETE FROM schema_migrations WHERE version=40');const migrationFiles=await readdir(resolve(root,'database/migrations'));for(let version=34;version<=40;version++){const filename=migrationFiles.find(file=>file.startsWith(String(version).padStart(3,'0')+'_'))!,sql=await readFile(resolve(root,'database/migrations',filename),'utf8');await admin.execute('INSERT INTO schema_migrations(version,name,checksum) VALUES(?,?,?)',[version,filename,migrationChecksum(sql)])}assert.equal((await run(schemas.historical)).version,45);assert.deepEqual(await schemaSignature(schemas.historical),await schemaSignature(schemas.fresh));

    await initializeLevel40(schemas.before);await assert.rejects(run(schemas.before,crash('before-step',41,1)),SimulatedMigrationInterruption);assert.equal((await run(schemas.before)).version,45);
    await initializeLevel40(schemas.ddl);await assert.rejects(run(schemas.ddl,crash('after-statement-before-journal',41,1)),SimulatedMigrationInterruption);assert.equal((await run(schemas.ddl)).version,45);
    await initializeLevel40(schemas.middle);await assert.rejects(run(schemas.middle,crash('after-statement-before-journal',43,2)),SimulatedMigrationInterruption);assert.equal((await run(schemas.middle)).version,45);
    await initializeLevel40(schemas.journal);await assert.rejects(run(schemas.journal,crash('before-migration-journal',45)),SimulatedMigrationInterruption);assert.deepEqual((await versions(schemas.journal)).map(row=>Number(row.version)),[40,41,42,43,44]);assert.equal((await run(schemas.journal)).version,45);
    await initializeLevel40(schemas.mixed);await assert.rejects(run(schemas.mixed,crash('after-statement-before-journal',42,3)),SimulatedMigrationInterruption);assert.equal((await run(schemas.mixed)).version,45);await admin.query(`USE \`${schemas.mixed}\``);const[categories]=await admin.query<RowDataPacket[]>('SELECT COUNT(*) total,COUNT(DISTINCT CONCAT(concession_id,code)) distinct_total FROM internal_stock_categories');assert.equal(Number(categories[0]!.total),Number(categories[0]!.distinct_total));

    const addDuplicateCustomers=async(schema:string,kind:'email'|'phone')=>{await initializeLevel40(schema);const[concession]=await admin.execute<any>(`INSERT INTO \`${schema}\`.concessions(name,code) VALUES(?,?)`,[`Migration ${kind}`,`M45_${kind}`]);const[agency]=await admin.execute<any>(`INSERT INTO \`${schema}\`.agencies(concession_id,name,code) VALUES(?,?,?)`,[concession.insertId,'Agence',`M45A_${kind}`]);const values=kind==='email'?[['M45-1',' Conflict@Example.com ',null],['M45-2','conflict@example.com',null]]:[['M45-1',null,'06 12-34'],['M45-2',null,'061234']];for(const[code,email,phone]of values)await admin.execute(`INSERT INTO \`${schema}\`.customers(customer_code,agency_id,last_name,email,phone) VALUES(?,?,?,?,?)`,[code,agency.insertId,'Client',email,phone]);};
    await addDuplicateCustomers(schemas.emailConflict,'email');await assert.rejects(run(schemas.emailConflict),error=>/MIGRATION_PREFLIGHT_CONFLICT: email: 1 groupe\(s\); aucune donnée modifiée/.test(String(error))&&!/conflict@example\.com/i.test(String(error)));assert.equal((await versions(schemas.emailConflict)).some(row=>Number(row.version)===45),false);
    await addDuplicateCustomers(schemas.phoneConflict,'phone');await assert.rejects(run(schemas.phoneConflict),error=>/MIGRATION_PREFLIGHT_CONFLICT: téléphone: 1 groupe\(s\); aucune donnée modifiée/.test(String(error))&&!/061234/.test(String(error)));assert.equal((await versions(schemas.phoneConflict)).some(row=>Number(row.version)===45),false);
    await initializeLevel40(schemas.m45before);await assert.rejects(run(schemas.m45before,crash('before-step',45,1)),SimulatedMigrationInterruption);assert.equal((await run(schemas.m45before)).version,45);
    await initializeLevel40(schemas.m45ddl);await assert.rejects(run(schemas.m45ddl,crash('after-statement-before-journal',45,2)),SimulatedMigrationInterruption);assert.equal((await run(schemas.m45ddl)).version,45);

    await initializeLevel40(schemas.ambiguous);await admin.query('ALTER TABLE notifications ADD COLUMN archived_at DATETIME NULL AFTER read_at');await assert.rejects(run(schemas.ambiguous),/MIGRATION_FAILED_PARTIAL/);await assert.rejects(run(schemas.ambiguous),/MIGRATION_FAILED_PARTIAL/);assert.deepEqual((await versions(schemas.ambiguous)).map(row=>Number(row.version)),[40]);

    await initializeLevel40(schemas.concurrent);useEnvironment(schemas.concurrent);const concurrent=await Promise.all([bootstrapDatabase(),bootstrapDatabase()]);assert.deepEqual(concurrent.map(result=>result.version),[45,45]);assert.equal((await versions(schemas.concurrent)).filter(row=>Number(row.version)===45).length,1);
    await admin.query(`SELECT IS_FREE_LOCK(?) free`,[migrationLockName(schemas.concurrent)]).then(([rows])=>assert.equal(Number((rows as RowDataPacket[])[0]!.free),1));

    await admin.query(`USE \`${schemas.fresh}\``);const[invariants]=await admin.query<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM roles WHERE code='SUPER_ADMIN' AND is_system=TRUE) system_roles,
      (SELECT COUNT(*) FROM permissions WHERE is_active=TRUE) active_permissions,
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN('internal_stock_categories','budget_categories','budget_fund_movements')) recent_tables`);
    assert.equal(Number(invariants[0]!.system_roles),1);assert.ok(Number(invariants[0]!.active_permissions)>0);assert.equal(Number(invariants[0]!.recent_tables),3);
  }finally{for(const schema of names)await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});
