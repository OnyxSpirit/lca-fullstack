import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/App.tsx');
const sales = read('../src/modules/sales/SalesListPage.tsx');
const quotationsPage = read('../src/modules/sales/QuotationsPage.tsx');
const quotations = read('../src/modules/sales/QuotationsSection.tsx');
const tabs = read('../src/modules/sales/SalesSectionTabs.tsx');

test('/sales conserve uniquement la section Ventes', () => {
  assert.match(app, /path="sales" element={<ModuleGuard module="sales">/);
  assert.match(sales, /<SalesSectionTabs active="sales" \/>/);
  assert.match(sales, /useSalesPageQuery/);
  assert.doesNotMatch(sales, /useQuotationsPageQuery|QuotationsSection|Propositions et devis/);
});

test('/sales/quotations conserve uniquement la section Devis avec sa permission propre', () => {
  assert.match(app, /path="sales\/quotations" element={<PermissionGuard permission="quotations\.view">/);
  assert.match(quotationsPage, /<SalesSectionTabs active="quotations" \/>/);
  assert.match(quotationsPage, /<QuotationsSection \/>/);
  assert.match(quotations, /useQuotationsPageQuery/);
  assert.doesNotMatch(quotationsPage + quotations, /useSalesPageQuery|SaleWizardModal|Chiffre d'Affaires Ventes/);
});

test('les deux onglets utilisent des liens accessibles pilotés par URL et RBAC dynamique', () => {
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /role="tab"/);
  assert.match(tabs, /aria-selected=/);
  assert.match(tabs, /to: '\/sales'/);
  assert.match(tabs, /to: '\/sales\/quotations'/);
  assert.match(tabs, /can\('sales\.view'\)/);
  assert.match(tabs, /can\('quotations\.view'\)/);
  assert.doesNotMatch(tabs, /useState|navigate\(/);
});

test('la facturation reste absente de la réorganisation Ventes/Devis', () => {
  assert.doesNotMatch(tabs + sales + quotationsPage + quotations, /BillingPage|Factures|\/billing/);
});
