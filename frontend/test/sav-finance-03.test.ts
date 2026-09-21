import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const billing=read('../src/modules/billing/BillingPage.tsx');
const hooks=read('../src/api/erpHooks.ts');
const reports=read('../src/modules/reports/ReportsPage.tsx');

test('SAV-FINANCE-03 affiche les trois montants SAV absolus',()=>{
  for(const label of ['CA SAV facturé','Encaissements SAV','Reste à encaisser SAV'])assert.ok(reports.includes(label),label);
  for(const field of ['workshop_revenue','workshop_collected','workshop_outstanding'])assert.ok(reports.includes(field),field);
});

test('SAV-FINANCE-03 présente et relie une facture Atelier à son vrai OR selon permission',()=>{
  assert.match(billing,/Facture Atelier \/ SAV/);
  assert.match(hooks,/r\.repair_order_number \?\? `OR \$\{r\.repair_order_id\}`/);
  assert.match(billing,/can\('service\.order\.view'\)/);
  assert.match(billing,/detailRoutes\.repairOrder/);
  assert.match(hooks,/k==='agencyId'\?'billingAgencyId':k/);
});
