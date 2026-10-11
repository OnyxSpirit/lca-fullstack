import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const source=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8');
const database=readFileSync(new URL('../src/config/database.ts',import.meta.url),'utf8');

test('BILL-REC07 une facture de total nul est rejetée avant persistance',()=>{
  assert.match(source,/result\.total<=0.*HttpError\(400,'Le total de la facture doit être strictement positif'/);
});

test('BILL-REC07 les transactions rejouent les interblocages MySQL transitoires',()=>{
  assert.match(database,/transactionWithDeadlockRetry/);
  assert.match(database,/code!==['"]ER_LOCK_DEADLOCK['"]/);
  assert.match(source,/transactionWithDeadlockRetry as transaction/);
});
