import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Billing transmet l’agence active et distingue les quatre états', () => {
  const page = read('../src/modules/billing/BillingPage.tsx');
  assert.match(page, /agencyId: agency\?\.id/);
  assert.match(page, /query\.isLoading/);
  assert.match(page, /query\.isError/);
  assert.match(page, /Aucune facture'/);
  assert.match(page, /Aucune facture ne correspond à vos critères/);
  assert.ok(page.includes('TableEmptyState colSpan={9}'));
});

test('le formulaire attend la configuration TVA au lieu d’utiliser 18.9', () => {
  const modal = read('../src/modules/billing/NewInvoiceModal.tsx');
  assert.doesNotMatch(modal, /18[.,]9/);
  assert.match(modal, /config\.data\.defaultVatRate/);
  assert.match(modal, /disabled={!form\.customerId \|\| !agency\?\.id \|\| !config\.data}/);
});

test('les rôles pièces ne disposent plus de Billing côté frontend', () => {
  const permissions = read('../src/navigation/permissions.ts');
  const partsRules = permissions.slice(permissions.indexOf("case 'PARTS_MANAGER'"), permissions.indexOf("case 'DELIVERY_MANAGER'"));
  assert.doesNotMatch(partsRules, /billing/);
});
