import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const page=readFileSync(new URL('../src/modules/service/ServiceDashboardPage.tsx',import.meta.url),'utf8'),panel=readFileSync(new URL('../src/modules/service/ExternalCustomersPanel.tsx',import.meta.url),'utf8'),hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');

test('14C4-FE-01 onglet interne au SAV et permissionné dynamiquement',()=>{assert.match(page,/Clients extérieurs/);assert.match(page,/can\('service\.order\.view'\)&&can\('customers\.view'\)/);assert.doesNotMatch(page,/SUPER_ADMIN|role===|roleName/)});
test('14C4-FE-02 liste API réelle avec recherche temporisée, pagination et états',()=>{assert.match(panel,/useExternalWorkshopCustomersQuery/);assert.match(panel,/setTimeout\(.*350/);assert.match(panel,/Aucun client extérieur trouvé\./);assert.match(panel,/Chargement des clients extérieurs/);assert.match(panel,/Page \{page\}/)});
test('14C4-FE-03 détail expose véhicules et OR extérieurs sans montant',()=>{assert.match(panel,/Véhicules extérieurs reçus à l’Atelier/);assert.match(panel,/Historique des OR extérieurs/);assert.match(panel,/useExternalWorkshopCustomerDetailQuery/);assert.doesNotMatch(panel,/formatCurrency|montant|totalTTC/)});
test('14C4-FE-04 réutilise Client 360 et Nouvel OR présélectionné',()=>{assert.match(panel,/navigate\(`\/customers\/\$\{detail\.customer\.id\}`\)/);assert.match(page,/initialCustomerId=\{newOrderCustomerId\}/);assert.match(page,/ExternalCustomersPanel/);assert.match(page,/setNewOrderCustomerId\(customerId\)/)});
test('14C4-FE-05 query keys suivent repair-orders pour invalidation ciblée',()=>{assert.match(hooks,/erpKeys\.repairOrders,'external-customers'/);assert.match(hooks,/\/workshop\/external-customers/)});
