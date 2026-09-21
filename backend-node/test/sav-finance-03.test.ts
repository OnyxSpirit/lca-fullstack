import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const reports=readFileSync(new URL('../src/modules/reports/report.routes.ts',import.meta.url),'utf8');
const billing=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8');

test('SAV-FINANCE-03 encaissements Atelier suivent les mouvements sans double comptage',()=>{
  assert.match(reports,/FROM payments p JOIN invoices i ON i\.id=p\.invoice_id WHERE i\.invoice_type='workshop'/);
  assert.match(reports,/DATE\(p\.payment_date\) BETWEEN \? AND \?/);
  assert.match(reports,/DATE\(p\.refunded_at\) BETWEEN \? AND \?/);
  assert.doesNotMatch(reports,/SUM\(i\.amount_paid\).*workshop_collected/);
});

test('SAV-FINANCE-03 agencyId intersecte le scope RBAC du listing central',()=>{
  assert.match(billing,/scoped=billingScopeSql\(r,'billing\.invoice\.view'\)/);
  assert.match(billing,/r\.query\.billingAgencyId\?\?r\.query\.agencyId/);
  assert.match(billing,/repair_order_number/);
});
