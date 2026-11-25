import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import mysql,{type Connection,type RowDataPacket} from 'mysql2/promise';
import {ensureMigrationStepJournal,executeResilientMigration,migrationChecksum,splitSqlStatements} from '../src/scripts/mysql-migration-runner.js';

const enabled=process.env.MIGRATION_MYSQL_TEST==='1';
const replacement=async()=>splitSqlStatements(await readFile(new URL('../database/migrations/135_evolution_lca_02_foundation.sql',import.meta.url),'utf8'))[6]!;

async function foundation(connection:Connection){
  await connection.query(`CREATE TABLE customers(id BIGINT UNSIGNED PRIMARY KEY) ENGINE=InnoDB;
    CREATE TABLE invoices(id BIGINT UNSIGNED PRIMARY KEY,customer_id BIGINT UNSIGNED NOT NULL,KEY fk_invoice_customer(customer_id),CONSTRAINT fk_invoice_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT) ENGINE=InnoDB;
    INSERT INTO customers VALUES(1);INSERT INTO invoices VALUES(10,1)`);
  await ensureMigrationStepJournal(connection);
}

async function assertFinal(connection:Connection){
  const[columns]=await connection.query<RowDataPacket[]>(`SELECT column_name,is_nullable FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='invoices' AND column_name IN('customer_id','third_party_customer_name','third_party_customer_phone','third_party_customer_address') ORDER BY column_name`);
  assert.equal(columns.length,4);assert.equal(String(columns.find(row=>(row.COLUMN_NAME??row.column_name)==='customer_id')?.IS_NULLABLE??columns.find(row=>(row.COLUMN_NAME??row.column_name)==='customer_id')?.is_nullable),'YES');
  const[fks]=await connection.query<RowDataPacket[]>(`SELECT k.constraint_name,k.column_name,k.referenced_table_name,k.referenced_column_name,r.delete_rule,r.update_rule FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r ON r.constraint_schema=k.constraint_schema AND r.constraint_name=k.constraint_name AND r.table_name=k.table_name WHERE k.constraint_schema=DATABASE() AND k.table_name='invoices' AND k.constraint_name='fk_invoice_customer'`);
  const fk=fks[0]!;assert.equal(fks.length,1);assert.equal(String(fk.COLUMN_NAME??fk.column_name),'customer_id');assert.equal(String(fk.REFERENCED_TABLE_NAME??fk.referenced_table_name),'customers');assert.equal(String(fk.REFERENCED_COLUMN_NAME??fk.referenced_column_name),'id');assert.equal(String(fk.DELETE_RULE??fk.delete_rule),'RESTRICT');assert.equal(String(fk.UPDATE_RULE??fk.update_rule),'RESTRICT');
  const[data]=await connection.query<RowDataPacket[]>('SELECT id,customer_id FROM invoices');assert.deepEqual(data.map(row=>[Number(row.id),Number(row.customer_id)]),[[10,1]]);
}

test('INFRA-135 MySQL 8.4 : substitution de FK fraîche et reprises contrôlées',{skip:!enabled,timeout:240_000},async()=>{
  const configuration={host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??''};
  const admin=await mysql.createConnection(configuration),prefix=`lca_infra135_${process.pid}_`,schemas=['fresh','after_drop','after_columns','failed_partial','incompatible'].map(s=>`${prefix}${s}`),sql=await replacement();
  try{
    for(const schema of schemas){await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);const connection=await mysql.createConnection({...configuration,database:schema,multipleStatements:true});await foundation(connection);await connection.end()}
    const run=async(schema:string)=>{const connection=await mysql.createConnection({...configuration,database:schema});try{await executeResilientMigration(connection,{version:135,name:'135_evolution_lca_02_foundation.sql',sql},undefined,false);await assertFinal(connection)}finally{await connection.end()}};
    await run(schemas[0]!);
    let connection=await mysql.createConnection({...configuration,database:schemas[1]!});await connection.query('ALTER TABLE invoices DROP FOREIGN KEY fk_invoice_customer');await connection.execute(`INSERT INTO schema_migration_steps(version,migration_name,step_no,statement_checksum,kind,status) VALUES(135,'135_evolution_lca_02_foundation.sql',1,?,'DDL','RUNNING')`,[migrationChecksum(sql)]);await connection.end();await run(schemas[1]!);
    connection=await mysql.createConnection({...configuration,database:schemas[2]!});await connection.query('ALTER TABLE invoices DROP FOREIGN KEY fk_invoice_customer,MODIFY customer_id BIGINT UNSIGNED NULL,ADD COLUMN third_party_customer_name VARCHAR(200) NULL AFTER customer_id,ADD COLUMN third_party_customer_phone VARCHAR(50) NULL AFTER third_party_customer_name,ADD COLUMN third_party_customer_address VARCHAR(500) NULL AFTER third_party_customer_phone');await connection.execute(`INSERT INTO schema_migration_steps(version,migration_name,step_no,statement_checksum,kind,status) VALUES(135,'135_evolution_lca_02_foundation.sql',1,?,'DDL','RUNNING')`,[migrationChecksum(sql)]);await connection.end();await run(schemas[2]!);
    connection=await mysql.createConnection({...configuration,database:schemas[3]!});await connection.execute(`INSERT INTO schema_migration_steps(version,migration_name,step_no,statement_checksum,kind,status,error_message) VALUES(135,'135_evolution_lca_02_foundation.sql',1,?,'DDL','FAILED_PARTIAL','Duplicate foreign key constraint name')`,[migrationChecksum(sql)]);await connection.end();await run(schemas[3]!);
    connection=await mysql.createConnection({...configuration,database:schemas[4]!});await connection.query('ALTER TABLE invoices DROP FOREIGN KEY fk_invoice_customer');await connection.query('CREATE TABLE other_customers(id BIGINT UNSIGNED PRIMARY KEY)');await connection.query('INSERT INTO other_customers VALUES(1)');await connection.query('ALTER TABLE invoices ADD CONSTRAINT fk_invoice_customer FOREIGN KEY(customer_id) REFERENCES other_customers(id)');await assert.rejects(executeResilientMigration(connection,{version:135,name:'135.sql',sql},undefined,false),/MIGRATION_FAILED_PARTIAL/);const[incompatible]=await connection.query<RowDataPacket[]>('SELECT status,error_message FROM schema_migration_steps WHERE version=135 AND step_no=1');assert.equal(String(incompatible[0]!.status),'FAILED_PARTIAL');assert.match(String(incompatible[0]!.error_message),/MIGRATION_FOREIGN_KEY_INCOMPATIBLE/);await connection.end();
  }finally{for(const schema of schemas)await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});
