import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const billing = read('../../backend-node/src/modules/billing/billing.routes.ts');
const vehicles = read('../../backend-node/src/modules/vehicles/vehicle.routes.ts');
const reconciliation = read('../../backend-node/src/modules/treasury/bank-reconciliation.service.ts');
const reconciliationAdvanced = read('../../backend-node/src/modules/treasury/bank-reconciliation-advanced.service.ts');
const reconciliationGroups = read('../../backend-node/src/modules/treasury/bank-reconciliation-group-query.service.ts');
const invoicePage = read('../src/modules/billing/InvoiceDetailPage.tsx');
const vehicleTransfers = read('../src/modules/vehicles/VehicleTransfersPanel.tsx');
const bankPanel = read('../src/modules/treasury/BankReconciliationPanel.tsx');

test('PAG-009..012 les historiques de facture utilisent trois pages serveur indépendantes', () => {
  for (const table of ['payments', 'payment_refunds', 'credit_notes']) assert.match(billing, new RegExp(`COUNT\\(\\*\\) total FROM ${table}`));
  assert.ok((billing.match(/LIMIT \? OFFSET \?/g) ?? []).length >= 3);
  assert.match(billing, /res\.json\(\{\.\.\.visibleInvoice,[^;]*items\}\);/);
  for (const state of ['paymentPageSize', 'refundPageSize', 'creditPageSize']) assert.match(invoicePage, new RegExp(`${state}[^\n]*useState\\(10\\)`));
  assert.ok((invoicePage.match(/<ServerPagination/g) ?? []).length >= 3);
});

test('PAG-114 les transferts véhicules sont filtrés puis paginés dans le scope agence', () => {
  assert.match(vehicles, /COUNT\(\*\) total FROM vehicle_interagency_transfers/);
  assert.match(vehicles, /source_agency_id=\? OR t\.destination_agency_id=\?/);
  assert.match(vehicles, /LIMIT \? OFFSET \?/);
  assert.match(vehicleTransfers, /pageSize[^\n]*useState\(10\)/);
  assert.match(vehicleTransfers, /<ServerPagination/);
});

test('PAG-127..129 rapprochements, écarts et mouvements utilisent des pages serveur', () => {
  assert.match(reconciliationGroups, /COUNT\(\*\) total/);
  assert.match(reconciliationGroups, /LIMIT \? OFFSET \?/);
  assert.match(reconciliationAdvanced, /COUNT\(\*\) total/);
  assert.doesNotMatch(reconciliationAdvanced, /LIMIT 500/);
  assert.match(reconciliation, /COUNT\(\*\) total FROM treasury_movements/);
  assert.match(reconciliation, /LIMIT \? OFFSET \?/);
  assert.ok((bankPanel.match(/<ServerPagination/g) ?? []).length >= 2);
});
