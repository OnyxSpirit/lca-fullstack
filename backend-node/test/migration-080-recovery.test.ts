import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Connection,RowDataPacket} from 'mysql2/promise';
import {ddlState,splitSqlStatements} from '../src/scripts/mysql-migration-runner.js';

const migration=readFileSync(new URL('../database/migrations/080_document_mark_policies.sql',import.meta.url),'utf8');
const statements=splitSqlStatements(migration);
const connection=(columnType:string,nullable:'YES'|'NO'='NO')=>({
  execute:async()=>[[{column_type:columnType,is_nullable:nullable}]as RowDataPacket[],[]],
}) as unknown as Connection;

test('M080 étape 3 est le MODIFY document_context attendu',()=>{
  assert.equal(statements.length,6);
  assert.match(statements[2]!,/^ALTER TABLE document_mark_snapshots\s+MODIFY document_context VARCHAR\(50\) NOT NULL$/s);
});

test('M080 reprise reconnaît exactement VARCHAR(50) NOT NULL',async()=>{
  assert.equal(await ddlState(connection('varchar(50)'),statements[2]!),'SATISFIED');
});

test('M080 reprise refuse une divergence de type ou de nullabilité',async()=>{
  assert.equal(await ddlState(connection('varchar(40)'),statements[2]!),'AMBIGUOUS');
  assert.equal(await ddlState(connection('varchar(50)','YES'),statements[2]!),'AMBIGUOUS');
});
