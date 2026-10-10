import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const treasury = read('src/modules/treasury/TreasuryPage.tsx');
const reconciliation = read('src/modules/treasury/BankReconciliationPanel.tsx');
const suppliers = read('src/modules/parts/SupplierInvoicesPanel.tsx');
const remunerations = read('src/modules/hr/RemunerationsAdministration.tsx');
const reporting = read('src/modules/reports/FinancialReportPanel.tsx');
const billing = read('src/modules/billing/BillingPage.tsx');
const modal = read('src/components/ui/Modal.tsx');
const button = read('src/components/ui/Button.tsx');
const tabs = read('src/components/ui/Tabs.tsx');

test('FIN08-01..07 navigation financière et permissions', () => {
  for (const label of ['Vue d’ensemble', 'Couverture', 'Rapprochement bancaire', 'Comptes', 'Journal', 'Catégories']) assert.match(treasury, new RegExp(label));
  assert.match(treasury, /treasury\.reconciliation\.view/);
  assert.match(suppliers, /supplier\.invoice\.view/);
  assert.match(remunerations, /hr\.remuneration\./);
  assert.match(reporting, /reporting\.view/);
  assert.match(billing, /Factur/);
});

test('FIN08-08..17 actions, concurrence, chargement et états vides', () => {
  assert.match(suppliers, /\['DRAFT','REJECTED'\]\.includes/);
  assert.match(suppliers, /Object\.values\(actions\).*isPending/);
  assert.match(reconciliation, /if\(actions\.reconcile\.isPending\)return/);
  assert.match(reconciliation, /Cette opération a déjà été traitée/);
  assert.match(button, /disabled=\{disabled \|\| loading\}/);
  assert.match(button, /aria-busy/);
  assert.match(treasury, /Chargement des comptes/);
  for (const value of ['Aucun mouvement', 'Aucun relevé', 'Aucune facture fournisseur', 'Aucune rémunération']) {
    assert.ok([treasury, reconciliation, suppliers, remunerations].some(source => source.includes(value)), value);
  }
});

test('FIN08-18..26 filtres, montants, devises et statuts', () => {
  for (const token of ['filters.from', 'filters.to', 'filters.status', 'currency_code', 'balance_due']) assert.ok([treasury, suppliers, reporting].some(source => source.includes(token)), token);
  assert.match(treasury, /setFilters/);
  assert.match(reporting, /sans conversion entre devises/);
  assert.match(reporting, /new Intl\.NumberFormat\('fr-FR'/);
  assert.match(remunerations, /Brouillon/);
  assert.match(remunerations, /Partiellement payée/);
});

test('FIN08-27..31 formulaires, modales et accessibilité', () => {
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-labelledby/);
  assert.match(modal, /querySelectorAll<HTMLElement>/);
  assert.match(modal, /previousFocus\?\.focus/);
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected/);
  assert.match(button, /Traitement en cours/);
});

test('FIN08-32..36 responsive, tableaux larges et exports', () => {
  assert.match(reconciliation, /overflow-x-auto/);
  assert.match(suppliers, /overflow-x-auto/);
  assert.match(reconciliation, /min-w-\[700px\]/);
  assert.match(reporting, /financial-export/);
  assert.match(reporting, /reporting\.export/);
  assert.match(reporting, /agencyId/);
  assert.match(reporting, /currency/);
});

test('FIN08-37..40 confidentialité, invalidation et non-régression', () => {
  assert.match(remunerations, /can\('hr\.remuneration\.pay'\)/);
  assert.match(reconciliation, /can\('treasury\.reconciliation\.export'\)/);
  assert.match(reconciliation, /Aucun mouvement Treasury n’a été créé ou modifié/);
  assert.doesNotMatch(reconciliation, /window\.(prompt|confirm|alert)/);
  assert.doesNotMatch(reporting, /window\.(prompt|confirm|alert)/);
});
