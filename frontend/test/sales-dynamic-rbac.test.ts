import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('SALE-23/24/25/26 : toutes les actions Ventes utilisent can(permission)',()=>{
  const list=read('../src/modules/sales/SalesListPage.tsx'),detail=read('../src/modules/sales/SaleDetailPage.tsx');
  assert.match(list,/can\('sales\.create'\)/);assert.match(list,/canCreate\?<Button/);
  for(const permission of ['sales.update','sales.confirm','sales.cancel'])assert.ok(detail.includes(`can('${permission}')`),permission);
  assert.match(detail,/canUpdateSale&&/);assert.match(detail,/next&&canConfirm&&/);assert.match(detail,/canCancelSale&&/);
});

test('SALE-27 : garde de route basé sur sales.view et rôle arbitraire non énuméré',()=>{const app=read('../src/App.tsx');assert.match(app,/sales:'sales\.view'/);assert.doesNotMatch(read('../src/modules/sales/SalesListPage.tsx'),/SALES_AGENT|SALES_REP|SALES_MANAGER|DIRECTOR/)});

test('le wizard utilise scopes, sales.assign et permissions du commercial cible',()=>{const wizard=read('../src/modules/sales/SaleWizardModal.tsx');assert.match(wizard,/permissionScope\('sales\.create'\)/);assert.match(wizard,/can\('sales\.assign'\)/);assert.match(wizard,/sales\.create/);assert.doesNotMatch(wizard,/roles\.includes|SALES_REP|SALES_MANAGER/)});

test('SALE-29/30 : paiements et livraison restent sous leurs permissions propres',()=>{const detail=read('../src/modules/sales/SaleDetailPage.tsx');assert.match(detail,/billing\.payment\.collect/);assert.match(detail,/billing\.invoice\.create/);assert.match(detail,/delivery\.view/);assert.match(detail,/delivery\.prepare/)});

test('l’action rapide de vente accepte une permission dynamique sans whitelist de rôle',()=>{const quick=read('../src/components/layout/QuickActionModal.tsx');assert.match(quick,/canCreateSale=can\('sales\.create'\)/);assert.match(quick,/act\.id==='sale'\?canCreateSale/)});
