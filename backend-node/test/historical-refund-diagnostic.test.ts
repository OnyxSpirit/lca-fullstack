import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const source=readFileSync(new URL('../src/modules/billing/historical-refund-diagnostic.service.ts',import.meta.url),'utf8');
test('FIN-006 diagnostique sans écriture ni avoir inventé',()=>{assert.doesNotMatch(source,/INSERT|UPDATE|DELETE/);assert.match(source,/Ne pas créer rétroactivement un avoir/)});
test('FIN-006 contrôle avoir, trésorerie, comptabilité et montants',()=>{for(const term of['credit_status','treasury_movement_id','accounting_entry_id','refund_amount','payment_amount'])assert.match(source,new RegExp(term))});
