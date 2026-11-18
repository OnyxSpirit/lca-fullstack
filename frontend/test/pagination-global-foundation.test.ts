import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const serverPagination = read('../src/components/common/ServerPagination.tsx');
const clientPagination = read('../src/components/common/ClientPagination.tsx');
const supplierPanel = read('../src/modules/parts/SupplierInvoicesPanel.tsx');
const supplierRoute = read('../../backend-node/src/modules/parts/supplier-finance.routes.ts');

test('PAG-GLOBAL-01 le composant partagé expose les tailles et la navigation complète', () => {
  assert.match(serverPagination, /STANDARD_PAGE_SIZES = \[10, 20, 50, 100\]/);
  for (const label of ['Première page', 'Page précédente', 'Page suivante', 'Dernière page']) {
    assert.match(serverPagination, new RegExp(label));
  }
  assert.match(serverPagination, /aria-current=/);
  assert.match(serverPagination, /start.*end.*total/s);
});

test('PAG-GLOBAL-02 la pagination client réutilise le même contrat standard', () => {
  assert.match(clientPagination, /STANDARD_PAGE_SIZES/);
  assert.match(clientPagination, /<ServerPagination/);
  assert.doesNotMatch(clientPagination, /\[10,25,50\]/);
});

test('PAG-082 les factures fournisseur sont paginées côté serveur', () => {
  assert.match(supplierRoute, /COUNT\(\*\) total/);
  assert.match(supplierRoute, /LIMIT \? OFFSET \?/);
  assert.match(supplierRoute, /res\.json\(\{items,total,page,pageSize,totalPages/);
  assert.match(supplierPanel, /page:1,pageSize:10/);
  assert.match(supplierPanel, /list\.data\?\.items/);
  assert.match(supplierPanel, /<ServerPagination/);
});
