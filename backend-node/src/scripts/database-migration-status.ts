import 'dotenv/config';
import {readdir,readFile} from 'node:fs/promises';
import mysql,{type RowDataPacket} from 'mysql2/promise';
import {databaseRoot,futureMigrationNames,isConsolidatedBaselineName} from './database-bootstrap.js';
import {historicalMigrationCompatibility,migrationChecksum} from './mysql-migration-runner.js';

const versionOf=(name:string)=>Number(/^([0-9]{3})_/.exec(name)?.[1]??-1);
type DiagnosticState='UNVERSIONED'|'READY'|'PENDING'|'WARNING'|'FAILED_SAFE'|'FAILED_PARTIAL'|'BLOCKED';

export async function migrationStatus(){
  const connection=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT??3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD??'',database:process.env.DB_NAME});
  try{
    const[tables]=await connection.query<RowDataPacket[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN('schema_migrations','schema_migration_steps')`),tableNames=tables.map(x=>String(x.TABLE_NAME??x.table_name));
    if(!tableNames.includes('schema_migrations'))return{database:process.env.DB_NAME,state:'UNVERSIONED' as DiagnosticState,applied:[],pending:[],failed:[],warnings:[],blocked:[]};
    const[history]=await connection.query<RowDataPacket[]>('SELECT version,name,checksum,applied_at FROM schema_migrations ORDER BY version');
    const[steps]=tableNames.includes('schema_migration_steps')?await connection.query<RowDataPacket[]>("SELECT version,migration_name,step_no,status,error_message,started_at FROM schema_migration_steps WHERE status<>'APPLIED' ORDER BY version,step_no"):[[]as RowDataPacket[],[]];
    const files=futureMigrationNames(await readdir(`${databaseRoot()}/migrations`)),appliedVersions=new Set(history.map(x=>Number(x.version))),baseline=Math.max(0,...history.filter(x=>isConsolidatedBaselineName(String(x.name))).map(x=>Number(x.version)));
    const pending=files.filter(file=>{const version=versionOf(file);return!appliedVersions.has(version)&&version>baseline}),warnings=[] as Array<{version:number;file:string;reason:string}>,blocked=[] as Array<{version:number;file:string;incompatibilities:Array<{step:number;state:string}>}>;
    for(const row of history){
      const file=files.find(candidate=>versionOf(candidate)===Number(row.version));if(!file||isConsolidatedBaselineName(String(row.name)))continue;
      const sql=await readFile(`${databaseRoot()}/migrations/${file}`,'utf8');if(migrationChecksum(sql)===String(row.checksum))continue;
      const compatibility=await historicalMigrationCompatibility(connection,sql);
      if(compatibility.compatible)warnings.push({version:Number(row.version),file,reason:'checksum historique différent; postconditions DDL compatibles; aucune réexécution'});
      else blocked.push({version:Number(row.version),file,incompatibilities:compatibility.incompatibilities});
    }
    const statuses=new Set(steps.map(x=>String(x.status)));let state:DiagnosticState='READY';
    if(statuses.has('FAILED_PARTIAL')||statuses.has('RUNNING'))state='FAILED_PARTIAL';else if(statuses.has('FAILED_SAFE'))state='FAILED_SAFE';else if(pending.length)state='PENDING';else if(blocked.length)state='BLOCKED';else if(warnings.length)state='WARNING';
    return{database:process.env.DB_NAME,state,connection:{host:process.env.DB_HOST,port:Number(process.env.DB_PORT??3306)},summary:{applied:history.length,pending:pending.length,warnings:warnings.length,blocked:blocked.length,incompleteSteps:steps.length},applied:history.map(x=>({version:Number(x.version),name:x.name,appliedAt:x.applied_at})),pending,failed:steps,warnings,blocked};
  }finally{await connection.end()}
}

export function formatMigrationStatus(result:Awaited<ReturnType<typeof migrationStatus>>){
  const summary=result.summary,connection=result.connection;if(!summary||!connection)return`État migrations : UNVERSIONED\nBase : ${result.database??'(non définie)'}`;
  const lines=[`Connexion MySQL : OK (${connection.host}:${connection.port}/${result.database})`,`État migrations : ${result.state}`,`Appliquées : ${summary.applied} | En attente : ${summary.pending} | Avertissements : ${summary.warnings} | Blocages : ${summary.blocked}`];
  if(result.pending.length)lines.push('',`Migrations en attente :\n${result.pending.map(file=>`- ${file}`).join('\n')}`);
  if(result.warnings.length)lines.push('',`Avertissements historiques :\n${result.warnings.map(item=>`- ${item.file} : ${item.reason}`).join('\n')}`);
  if(result.blocked.length)lines.push('',`Incompatibilités :\n${result.blocked.map(item=>`- ${item.file} : ${item.incompatibilities.map(x=>`étape ${x.step} ${x.state}`).join(', ')}`).join('\n')}`);
  if(result.failed.length)lines.push('',`Étapes incomplètes :\n${result.failed.map(item=>`- ${item.migration_name} étape ${item.step_no} : ${item.status}${item.error_message?` — ${item.error_message}`:''}`).join('\n')}`);
  return lines.join('\n');
}

if(process.argv[1]?.endsWith('database-migration-status.js')||process.argv[1]?.endsWith('database-migration-status.ts'))migrationStatus().then(result=>{console.log(formatMigrationStatus(result));if(['FAILED_SAFE','FAILED_PARTIAL','BLOCKED'].includes(result.state))process.exitCode=2}).catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1});
