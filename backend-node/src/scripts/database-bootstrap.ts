import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import {ensureMigrationStepJournal,executeResilientMigration,migrationChecksum,migrationLockName,splitSqlStatements,type MigrationFaultHook} from './mysql-migration-runner.js';

export const FRESH_BASELINE_VERSION=46;
export const MINIMUM_MIGRATION_VERSION=33;
export const databaseRoot=()=>resolve(process.env.DATABASE_ROOT??'database');
export const databasePath=(path:string)=>resolve(databaseRoot(),path);
const versionOf=(name:string)=>Number(/^([0-9]{3})_/.exec(name)?.[1]??-1);
export const futureMigrationNames=(names:string[])=>names.filter(name=>name.endsWith('.sql')&&versionOf(name)>MINIMUM_MIGRATION_VERSION).sort();

export type DatabaseState='EMPTY'|'VERSIONED'|'AMBIGUOUS';
export const shouldApplyMigration=(version:number,applied:Set<number>,hasConsolidatedBaseline:boolean)=>
  !applied.has(version)&&(!hasConsolidatedBaseline||version>FRESH_BASELINE_VERSION);
export function classifyDatabase(tableNames:string[]):DatabaseState{
  if(tableNames.includes('schema_migrations'))return 'VERSIONED';
  return tableNames.length===0?'EMPTY':'AMBIGUOUS';
}

export async function bootstrapDatabase(options:{faultHook?:MigrationFaultHook}={}){
  const connection=await mysql.createConnection({
    host:process.env.DB_HOST,port:Number(process.env.DB_PORT??3306),user:process.env.DB_USER,
    password:process.env.DB_PASSWORD??'',database:process.env.DB_NAME,multipleStatements:true,
  });
  let migrationLock=false;
  try{
    const lockName=migrationLockName(process.env.DB_NAME??'');
    const[locks]=await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?,30) acquired',[lockName]);
    if(Number(locks[0]?.acquired)!==1)throw new Error('MIGRATION_LOCK_TIMEOUT: un autre runner détient le verrou de migration');
    migrationLock=true;
    const[tables]=await connection.query<RowDataPacket[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'`);
    const tableNames=tables.map(row=>String(row.TABLE_NAME??row.table_name));
    const interruptedBaseline=!tableNames.includes('schema_migrations')&&tableNames.includes('schema_migration_steps');
    const state=interruptedBaseline?'EMPTY':classifyDatabase(tableNames);
    if(state==='AMBIGUOUS')throw new Error('DATABASE_AMBIGUOUS: base non vide sans schema_migrations; baseline refusé. Sauvegarder, auditer puis marquer manuellement la version.');
    if(state==='EMPTY'){
      await ensureMigrationStepJournal(connection);
      const baselineSql=`${await readFile(databasePath('baseline/001_initial_schema.sql'),'utf8')}\n${await readFile(databasePath('seeds/001_system_seed.sql'),'utf8')}`;
      await executeResilientMigration(connection,{version:FRESH_BASELINE_VERSION,name:'baseline_001_046+system_seed',sql:baselineSql},options.faultHook,false);
    }
    await ensureMigrationStepJournal(connection);
    if(state==='VERSIONED'&&tableNames.includes('schema_migration_steps')){
      const[baselineSteps]=await connection.execute<RowDataPacket[]>(`SELECT COUNT(*) total,SUM(status='APPLIED') applied FROM schema_migration_steps WHERE version=? AND migration_name='baseline_001_046+system_seed'`,[FRESH_BASELINE_VERSION]);
      if(Number(baselineSteps[0]?.total)>0){
        const baselineSql=`${await readFile(databasePath('baseline/001_initial_schema.sql'),'utf8')}\n${await readFile(databasePath('seeds/001_system_seed.sql'),'utf8')}`,expected=splitSqlStatements(baselineSql).length;
        if(Number(baselineSteps[0]?.total)<expected||Number(baselineSteps[0]?.applied)<expected)
        await executeResilientMigration(connection,{version:FRESH_BASELINE_VERSION,name:'baseline_001_046+system_seed',sql:baselineSql},options.faultHook,false);
      }
    }
    const[versions]=await connection.query<RowDataPacket[]>('SELECT version,name,checksum FROM schema_migrations');
    const applied=new Set(versions.map(row=>Number(row.version)));
    const hasConsolidatedBaseline=versions.some(row=>Number(row.version)===FRESH_BASELINE_VERSION&&String(row.name)==='baseline_001_046');
    if(Math.max(0,...applied)<MINIMUM_MIGRATION_VERSION)throw new Error(`DATABASE_VERSION_UNSUPPORTED: version inférieure à ${MINIMUM_MIGRATION_VERSION}; mise à niveau historique manuelle requise.`);
    const names=futureMigrationNames(await readdir(databasePath('migrations')));
    const futureVersions=names.map(versionOf);
    if(new Set(futureVersions).size!==futureVersions.length)throw new Error('DUPLICATE_MIGRATION_VERSION: une seule migration est autorisée par numéro.');
    for(const row of versions){
      const version=Number(row.version),name=String(row.name);if(name==='baseline_001_046')continue;
      const filename=names.find(candidate=>versionOf(candidate)===version);if(!filename)continue;
      const sql=await readFile(databasePath(`migrations/${filename}`),'utf8');
      if(String(row.checksum)!==migrationChecksum(sql))throw new Error(`MIGRATION_CHECKSUM_MISMATCH: ${filename} diffère du fichier déjà appliqué`);
    }
    for(const name of names){
      const version=versionOf(name);if(!shouldApplyMigration(version,applied,hasConsolidatedBaseline))continue;
      const sql=await readFile(databasePath(`migrations/${name}`),'utf8');
      console.log(`Migration ${name}: PENDING`);
      await executeResilientMigration(connection,{version,name,sql},options.faultHook);
      applied.add(version);
    }
    return {state,version:Math.max(...applied),migrations:names};
  }finally{
    if(migrationLock)await connection.execute('SELECT RELEASE_LOCK(?)',[migrationLockName(process.env.DB_NAME??'')]).catch(()=>undefined);
    await connection.end();
  }
}

if(process.argv[1]?.endsWith('database-bootstrap.js')||process.argv[1]?.endsWith('database-bootstrap.ts')){
  bootstrapDatabase().then(result=>console.log(`Database ${result.state}; niveau >= ${result.version}`)).catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
}
