import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path:string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const documents = read('../src/modules/documents/business-document.service.ts');
const billing = read('../src/modules/billing/billing.routes.ts');
const sales = read('../src/modules/sales/sale.service.ts');
const official = read('../src/modules/documents/official-document.routes.ts');

test('les annulations de facture et de vente produisent une archive canonique idempotente', () => {
  assert.match(documents, /archiveCancellation\(type:[^)]*version='v1'\)/);
  assert.match(documents, /cancellation:\$\{type\}:\$\{id\}:finalized:\$\{version\}/);
  assert.match(billing, /archiveCancellation\('invoice',invoiceId,r\.user!\.sub\)/);
  assert.match(sales, /archiveCancellation\('sale',saleId,request\.user!\.sub\)/);
  assert.match(documents, /SELECT id FROM documents WHERE source_key=\?/);
});

test('les GET officiels ne déclenchent aucun archivage', () => {
  assert.doesNotMatch(official, /archiveBusinessDocument|archiveCancellation|archivePaymentRefund/);
  assert.doesNotMatch(official, /INSERT\s+INTO\s+documents/i);
});

test('les générateurs officiels de remboursement et annulation conservent agence, auteur et empreinte', () => {
  assert.match(documents, /archivePaymentRefund\(id:[^)]*version='v1'\)/);
  assert.match(documents, /payment-refund:\$\{id\}:finalized:\$\{version\}/);
  assert.match(documents, /documentHash\(input\.buffer\)/);
  assert.match(documents, /agencyId:String\(row\.agency_id\)/);
  assert.match(documents, /createdBy,buffer/);
});
