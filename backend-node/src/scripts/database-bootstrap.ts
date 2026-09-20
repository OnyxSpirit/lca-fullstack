import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql, { type RowDataPacket } from 'mysql2/promise';

export const BASELINE_VERSION=33;
export const databaseRoot=()=>resolve(process.env.DATABASE_ROOT??'database');
export const databasePath=(path:string)=>resolve(databaseRoot(),path);
const versionOf=(name:string)=>Number(/^([0-9]{3})_/.exec(name)?.[1]??-1);
export const futureMigrationNames=(names:string[])=>names.filter(name=>name.endsWith('.sql')&&versionOf(name)>BASELINE_VERSION).sort();

export type DatabaseState='EMPTY'|'VERSIONED'|'AMBIGUOUS';
export function classifyDatabase(tableNames:string[]):DatabaseState{
  if(tableNames.includes('schema_migrations'))return 'VERSIONED';
  return tableNames.length===0?'EMPTY':'AMBIGUOUS';
}

export async function bootstrapDatabase(){
  const connection=await mysql.createConnection({
    host:process.env.DB_HOST,port:Number(process.env.DB_PORT??3306),user:process.env.DB_USER,
    password:process.env.DB_PASSWORD??'',database:process.env.DB_NAME,multipleStatements:true,
  });
  try{
    const[tables]=await connection.query<RowDataPacket[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'`);
    const state=classifyDatabase(tables.map(row=>String(row.TABLE_NAME??row.table_name)));
    if(state==='AMBIGUOUS')throw new Error('DATABASE_AMBIGUOUS: base non vide sans schema_migrations; baseline refusé. Sauvegarder, auditer puis marquer manuellement la version.');
    if(state==='EMPTY'){
      await connection.query(await readFile(databasePath('baseline/001_initial_schema.sql'),'utf8'));
      await connection.query(await readFile(databasePath('seeds/001_system_seed.sql'),'utf8'));
    }
    const[versions]=await connection.query<RowDataPacket[]>('SELECT version FROM schema_migrations');
    const applied=new Set(versions.map(row=>Number(row.version)));
    if(!applied.has(BASELINE_VERSION)&&Math.max(0,...applied)<BASELINE_VERSION)throw new Error(`DATABASE_VERSION_UNSUPPORTED: version inférieure à ${BASELINE_VERSION}; mise à niveau historique manuelle requise.`);
    const names=futureMigrationNames(await readdir(databasePath('migrations')));
    const futureVersions=names.map(versionOf);
    if(new Set(futureVersions).size!==futureVersions.length)throw new Error('DUPLICATE_MIGRATION_VERSION: une seule migration est autorisée par numéro.');
    for(const name of names){
      const version=versionOf(name);if(applied.has(version))continue;
      const sql=await readFile(databasePath(`migrations/${name}`),'utf8');
      await connection.beginTransaction();
      try{
        await connection.query(sql);
        await connection.execute('INSERT INTO schema_migrations(version,name,checksum) VALUES(?,?,?)',[version,name,createHash('sha256').update(sql).digest('hex')]);
        await connection.commit();
        applied.add(version);
      }catch(error){await connection.rollback();throw error;}
    }
    return {state,version:Math.max(BASELINE_VERSION,...applied),migrations:names};
  }finally{await connection.end();}
}

if(process.argv[1]?.endsWith('database-bootstrap.js')||process.argv[1]?.endsWith('database-bootstrap.ts')){
  bootstrapDatabase().then(result=>console.log(`Database ${result.state}; niveau >= ${result.version}`)).catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
}
