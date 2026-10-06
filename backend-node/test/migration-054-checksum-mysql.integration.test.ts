import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{after,test}from'node:test';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import{pool,query}from'../src/config/database.js';
import{bootstrapDatabase}from'../src/scripts/database-bootstrap.js';
import{executeResilientMigration,migrationChecksum}from'../src/scripts/mysql-migration-runner.js';

const enabled=process.env.MIGRATION_054_MYSQL_TEST==='1';
if(enabled)after(()=>pool.end());

test('MIG-054 historique publié converge vers 056 sans mismatch ni perte',{skip:!enabled,timeout:300000},async()=>{
  assert.equal((await bootstrapDatabase()).version,59);
  const[existing]=await pool.execute<ResultSetHeader>("INSERT INTO concessions(name,code,currency_code) VALUES('Historique 054','HIST054','XAF')");
  await pool.query('DROP TABLE treasury_account_mappings');
  await pool.query('DROP TABLE treasury_flow_configurations');
  await pool.query('ALTER TABLE warranty_claim_payments DROP FOREIGN KEY fk_wcp_payment_method, DROP COLUMN payment_method_id');
  await pool.query('DROP TABLE treasury_movements');
  await pool.query('DROP TABLE treasury_transfers');
  await pool.query('DROP TABLE treasury_categories');
  await pool.query('DROP TABLE treasury_accounts');
  await pool.execute('DELETE FROM schema_migration_steps WHERE version BETWEEN 54 AND 56');
  await pool.execute("UPDATE schema_migrations SET version=53,name='baseline_001_053' WHERE name='baseline_001_059'");

  const sql=readFileSync(new URL('../database/migrations/054_treasury_foundation.sql',import.meta.url),'utf8'),connection=await pool.getConnection();
  try{await executeResilientMigration(connection,{version:54,name:'054_treasury_foundation.sql',sql})}finally{connection.release()}
  const[recorded]=await query<RowDataPacket[]>('SELECT checksum FROM schema_migrations WHERE version=54');
  assert.equal(String(recorded[0]!.checksum),migrationChecksum(sql));
  assert.equal(String(recorded[0]!.checksum),'1b560a67ab37dcae82bec44fe911da122e1a854007e691315fb233217f775758');

  assert.equal((await bootstrapDatabase()).version,59);
  assert.equal((await bootstrapDatabase()).version,59);
  assert.equal(Number((await query<RowDataPacket[]>('SELECT COUNT(*) total FROM concessions WHERE id=?',[existing.insertId]))[0]!.total),1);
  const[index]=await query<RowDataPacket[]>("SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) columns_list FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='treasury_movements' AND index_name='uq_treasury_source_event' GROUP BY index_name");
  assert.equal(index[0]!.columns_list,'source_type,source_id,event_type');
  const versions=await query<RowDataPacket[]>('SELECT version,COUNT(*) total FROM schema_migrations WHERE version BETWEEN 54 AND 56 GROUP BY version ORDER BY version');
  assert.deepEqual(versions.map(row=>[Number(row.version),Number(row.total)]),[[54,1],[55,1],[56,1]]);
});
