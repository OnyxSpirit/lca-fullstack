import {createHash} from 'node:crypto';
import type {Connection,RowDataPacket} from 'mysql2/promise';

export type MigrationPhase='before-step'|'after-statement-before-journal'|'before-migration-journal';
export type MigrationFaultHook=(event:{phase:MigrationPhase;version:number;step:number;kind:'DDL'|'DML'})=>void|Promise<void>;
type StepRow=RowDataPacket&{step_no:number;statement_checksum:string;status:'RUNNING'|'APPLIED'|'FAILED_PARTIAL';kind:'DDL'|'DML'};

export class SimulatedMigrationInterruption extends Error{}

export function splitSqlStatements(sql:string):string[]{
  const statements:string[]=[];let current='',quote='',escaped=false;
  for(let index=0;index<sql.length;index++){
    const character=sql[index]!,next=sql[index+1];
    if(!quote&&character==='-'&&next==='-'&&(index===0||/\s/.test(sql[index-1]!))){while(index<sql.length&&sql[index]!== '\n')index++;current+='\n';continue}
    if(!quote&&character==='#'){while(index<sql.length&&sql[index]!== '\n')index++;current+='\n';continue}
    if(!quote&&character==='/'&&next==='*'){index+=2;while(index<sql.length-1&&!(sql[index]==='*'&&sql[index+1]==='/'))index++;index++;continue}
    if(quote){current+=character;if(escaped){escaped=false;continue}if(character==='\\'){escaped=true;continue}if(character===quote){if(sql[index+1]===quote){current+=sql[++index]!}else quote=''}continue}
    if(character==="'"||character==='"'||character==='`'){quote=character;current+=character;continue}
    if(character===';'){if(current.trim())statements.push(current.trim());current='';continue}
    current+=character;
  }
  if(quote)throw new Error('MIGRATION_SQL_INVALID: chaîne ou identifiant non fermé');
  if(current.trim())statements.push(current.trim());
  return statements;
}

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const identifier=(value:string)=>value.replaceAll('`','');
const isDdl=(statement:string)=>/^(?:CREATE|ALTER|DROP|RENAME|TRUNCATE)\b/i.test(statement.trim());

export function assertMigrationPreflight(result:unknown){
  if(!Array.isArray(result))return;
  const conflicts=result.flatMap(row=>{
    if(!row||typeof row!=='object')return [];
    const value=row as Record<string,unknown>,type=value.migration_conflict_type,count=Number(value.migration_conflict_groups??0);
    return typeof type==='string'&&Number.isFinite(count)&&count>0?[`${type}: ${count} groupe(s)`]:[];
  });
  if(conflicts.length)throw new Error(`MIGRATION_PREFLIGHT_CONFLICT: ${conflicts.join(', ')}; aucune donnée modifiée`);
}

async function objectExists(connection:Connection,type:'table'|'column'|'index'|'constraint',table:string,name?:string){
  const queries={
    table:`SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?`,
    column:`SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?`,
    index:`SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=?`,
    constraint:`SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name=? AND constraint_name=?`,
  };
  const[rows]=await connection.execute<RowDataPacket[]>(queries[type],name?[table,name]:[table]);return rows.length>0;
}

async function ddlState(connection:Connection,statement:string):Promise<'SATISFIED'|'ABSENT'|'AMBIGUOUS'>{
  const createIndex=/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(`?[a-zA-Z0-9_]+`?)\s+ON\s+(`?[a-zA-Z0-9_]+`?)/i.exec(statement);
  if(createIndex)return await objectExists(connection,'index',identifier(createIndex[2]!),identifier(createIndex[1]!))?'SATISFIED':'ABSENT';
  const create=/^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(`?[a-zA-Z0-9_]+`?)/i.exec(statement);
  if(create)return await objectExists(connection,'table',identifier(create[1]!))?'SATISFIED':'ABSENT';
  const alter=/^ALTER\s+TABLE\s+(`?[a-zA-Z0-9_]+`?)/i.exec(statement);
  if(!alter)return 'AMBIGUOUS';
  const table=identifier(alter[1]!),objects:Array<Promise<boolean>>=[];
  for(const match of statement.matchAll(/\bADD\s+COLUMN\s+(`?[a-zA-Z0-9_]+`?)/gi))objects.push(objectExists(connection,'column',table,identifier(match[1]!)));
  for(const match of statement.matchAll(/\bADD\s+(?:UNIQUE\s+)?(?:INDEX|KEY)\s+(`?[a-zA-Z0-9_]+`?)/gi))objects.push(objectExists(connection,'index',table,identifier(match[1]!)));
  for(const match of statement.matchAll(/\bADD\s+CONSTRAINT\s+(`?[a-zA-Z0-9_]+`?)/gi))objects.push(objectExists(connection,'constraint',table,identifier(match[1]!)));
  if(!objects.length)return 'AMBIGUOUS';
  const states=await Promise.all(objects);return states.every(Boolean)?'SATISFIED':states.every(value=>!value)?'ABSENT':'AMBIGUOUS';
}

export async function ensureMigrationStepJournal(connection:Connection){
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migration_steps(
    version INT UNSIGNED NOT NULL, migration_name VARCHAR(190) NOT NULL, step_no INT UNSIGNED NOT NULL,
    statement_checksum CHAR(64) NOT NULL, kind ENUM('DDL','DML') NOT NULL,
    status ENUM('RUNNING','APPLIED','FAILED_PARTIAL') NOT NULL, error_message VARCHAR(500) NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, applied_at DATETIME NULL,
    PRIMARY KEY(version,step_no)
  ) ENGINE=InnoDB`);
}

async function markFailed(connection:Connection,version:number,step:number,error:unknown){
  const message=(error instanceof Error?error.message:String(error)).slice(0,500);
  await connection.execute(`UPDATE schema_migration_steps SET status='FAILED_PARTIAL',error_message=? WHERE version=? AND step_no=?`,[message,version,step]);
}

export async function executeResilientMigration(connection:Connection,migration:{version:number;name:string;sql:string},faultHook?:MigrationFaultHook,recordMigration=true){
  const statements=splitSqlStatements(migration.sql),[rows]=await connection.execute<StepRow[]>('SELECT * FROM schema_migration_steps WHERE version=? ORDER BY step_no',[migration.version]);
  const recorded=new Map(rows.map(row=>[Number(row.step_no),row]));
  for(let index=0;index<statements.length;index++){
    const step=index+1,statement=statements[index]!,statementHash=hash(statement),kind=isDdl(statement)?'DDL':'DML',previous=recorded.get(step);
    if(previous&&previous.statement_checksum!==statementHash)throw new Error(`MIGRATION_CHECKSUM_MISMATCH: ${migration.name} étape ${step}`);
    if(previous?.status==='FAILED_PARTIAL')throw new Error(`MIGRATION_FAILED_PARTIAL: ${migration.name} étape ${step}; état automatique non prouvable, intervention requise`);
    if(previous?.status==='APPLIED'){
      if(kind==='DDL'&&await ddlState(connection,statement)!=='SATISFIED')throw new Error(`MIGRATION_SCHEMA_DIVERGED: ${migration.name} étape ${step}`);
      continue;
    }
    if(previous?.status==='RUNNING'&&kind==='DDL'){
      const state=await ddlState(connection,statement);
      if(state==='SATISFIED'){
        await connection.execute(`UPDATE schema_migration_steps SET status='APPLIED',error_message=NULL,applied_at=NOW() WHERE version=? AND step_no=?`,[migration.version,step]);
        console.log(`Migration ${migration.name} étape ${step}: RECOVERED`);continue;
      }
      if(state==='AMBIGUOUS')throw new Error(`MIGRATION_FAILED_PARTIAL: ${migration.name} étape ${step}; état automatique non prouvable, intervention requise`);
    }
    await faultHook?.({phase:'before-step',version:migration.version,step,kind});
    if(kind==='DDL'){
      await connection.execute(`INSERT INTO schema_migration_steps(version,migration_name,step_no,statement_checksum,kind,status) VALUES(?,?,?,?,?,'RUNNING') ON DUPLICATE KEY UPDATE status='RUNNING',error_message=NULL,started_at=NOW(),applied_at=NULL`,[migration.version,migration.name,step,statementHash,kind]);
      console.log(`Migration ${migration.name} étape ${step}: RUNNING DDL`);
      try{
        await connection.query(statement);
        await faultHook?.({phase:'after-statement-before-journal',version:migration.version,step,kind});
        await connection.execute(`UPDATE schema_migration_steps SET status='APPLIED',applied_at=NOW() WHERE version=? AND step_no=?`,[migration.version,step]);
      }catch(error){if(error instanceof SimulatedMigrationInterruption)throw error;await markFailed(connection,migration.version,step,error);throw new Error(`MIGRATION_FAILED_PARTIAL: ${migration.name} étape ${step}; DDL peut persister, intervention requise`,{cause:error});}
    }else{
      await connection.beginTransaction();
      try{
        await connection.execute(`INSERT INTO schema_migration_steps(version,migration_name,step_no,statement_checksum,kind,status) VALUES(?,?,?,?,?,'RUNNING') ON DUPLICATE KEY UPDATE status='RUNNING',error_message=NULL,started_at=NOW(),applied_at=NULL`,[migration.version,migration.name,step,statementHash,kind]);
        console.log(`Migration ${migration.name} étape ${step}: RUNNING DML`);
        const[result]=await connection.query(statement);
        assertMigrationPreflight(result);
        await faultHook?.({phase:'after-statement-before-journal',version:migration.version,step,kind});
        await connection.execute(`UPDATE schema_migration_steps SET status='APPLIED',applied_at=NOW() WHERE version=? AND step_no=?`,[migration.version,step]);
        await connection.commit();
      }catch(error){await connection.rollback();throw error;}
    }
    console.log(`Migration ${migration.name} étape ${step}: APPLIED`);
  }
  for(let index=0;index<statements.length;index++)if(isDdl(statements[index]!)&&await ddlState(connection,statements[index]!)!=='SATISFIED')throw new Error(`MIGRATION_POSTCONDITION_FAILED: ${migration.name} étape ${index+1}`);
  if(recordMigration){
    await faultHook?.({phase:'before-migration-journal',version:migration.version,step:statements.length,kind:'DML'});
    await connection.execute('INSERT INTO schema_migrations(version,name,checksum) VALUES(?,?,?)',[migration.version,migration.name,hash(migration.sql)]);
  }
  console.log(`Migration ${migration.name}: APPLIED`);
}

export const migrationChecksum=hash;
export const migrationLockName=(databaseName:string)=>`lca:migrations:${hash(databaseName).slice(0,32)}`;
