import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cents, validateLines } from '../src/modules/accounting/accounting-entry.service.ts';

const migration=readFileSync(new URL('../database/migrations/120_accounting_double_entry_engine.sql',import.meta.url),'utf8');
const service=readFileSync(new URL('../src/modules/accounting/accounting-entry.service.ts',import.meta.url),'utf8');
const routes=readFileSync(new URL('../src/modules/accounting/accounting-entry.routes.ts',import.meta.url),'utf8');

test('LOT3 calcule les montants en centimes sans flottants',()=>{
  assert.equal(cents('99999999999999999.99'),9999999999999999999n);
  assert.equal(cents('0.10')+cents('0.20'),30n);
  assert.throws(()=>cents('1.001'),/deux décimales/);
  assert.throws(()=>cents('-1'),/positif/);
});

test('LOT3 refuse les lignes ambiguës et les écritures déséquilibrées',()=>{
  const balanced=validateLines([
    {accountId:'1',label:'Banque',debit:'100.00',credit:'0'},
    {accountId:'2',label:'Client',debit:'0',credit:'100.00'},
  ]);
  assert.equal(balanced.length,2);
  assert.throws(()=>validateLines([
    {accountId:'1',label:'A',debit:'1',credit:'1'},
    {accountId:'2',label:'B',debit:'0',credit:'2'},
  ]),/soit un débit, soit un crédit/);
  assert.throws(()=>validateLines([
    {accountId:'1',label:'A',debit:'2',credit:'0'},
    {accountId:'2',label:'B',debit:'0',credit:'1'},
  ]),/déséquilibrée/);
});

test('LOT3 impose les invariants SQL et une séquence verrouillée',()=>{
  for(const table of ['accounting_sequences','accounting_entries','accounting_entry_lines']) assert.match(migration,new RegExp(`CREATE TABLE ${table}`));
  assert.match(migration,/DECIMAL\(19,2\)/);
  assert.match(migration,/CHECK\(\(debit>0 AND credit=0\) OR \(credit>0 AND debit=0\)\)/);
  assert.match(migration,/UNIQUE KEY uq_accounting_entry_reversal/);
  assert.match(service,/SELECT last_number FROM accounting_sequences[^']+FOR UPDATE/);
  assert.doesNotMatch(service,/SELECT\s+MAX\s*\(/i);
});

test('LOT3 protège chaque transition par une permission distincte',()=>{
  for(const permission of ['accounting.entry.view','accounting.entry.create','accounting.entry.update','accounting.entry.validate','accounting.entry.post','accounting.entry.reverse','accounting.entry.export']) assert.match(routes,new RegExp(permission.replaceAll('.','\\.')));
  assert.match(service,/status==='POSTED'\|\|e\.status==='REVERSED'/);
  assert.match(service,/periods\[0\]\?\.status!=='OPEN'/);
});
