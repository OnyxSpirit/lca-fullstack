import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const page=readFileSync(new URL('../src/modules/billing/BillingPage.tsx',import.meta.url),'utf8');
test('FIN-01 présente l’export avec une terminologie française exacte',()=>{
 assert.match(page,/Exporter les opérations de facturation/);
 assert.match(page,/operations-facturation\.csv/);
 assert.doesNotMatch(page,/Export journal comptable|journal-comptable\.csv/);
 assert.match(page,/can\('billing\.export'\)/);
});
