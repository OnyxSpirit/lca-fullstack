import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const cases = [
  ['CRM', '../src/modules/crm/CrmPage.tsx', 8, 'Aucun prospect', 'Aucun prospect ne correspond à vos critères'],
  ['Clients', '../src/modules/customers/CustomersListPage.tsx', 7, 'Aucun client', 'Aucun client ne correspond à vos critères'],
  ['Ventes', '../src/modules/sales/SalesListPage.tsx', 8, 'Aucune vente', 'Aucune vente ne correspond à vos critères'],
  ['SAV', '../src/modules/service/ServiceDashboardPage.tsx', 8, 'Aucun ordre de réparation', 'Aucun ordre de réparation ne correspond à vos critères'],
] as const;

for (const [moduleName, path, colSpan, emptyMessage, filteredMessage] of cases) {
  test(`${moduleName} conserve son tableau et distingue vide, filtres et chargement`, () => {
    const source = readSource(path);

    assert.match(source, /<thead/);
    assert.match(source, /<tbody/);
    assert.ok(source.includes(`TableEmptyState colSpan={${colSpan}}`));
    assert.match(source, /isLoading/);
    assert.match(source, /isError/);
    assert.ok(source.includes(emptyMessage));
    assert.ok(source.includes(filteredMessage));
  });
}

test('la ligne vide produit une structure HTML de tableau valide', () => {
  const component = readSource('../src/components/common/TableEmptyState.tsx');

  assert.match(component, /<tr>/);
  assert.match(component, /<td colSpan={colSpan}/);
  assert.match(component, /animate-spin/);
});
