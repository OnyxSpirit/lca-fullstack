import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL(`../src/${path}`,import.meta.url),'utf8');

test('Lot 2: les query keys des trois listes Pièces incluent page, pageSize et filtres',()=>{
  const hooks=read('api/erpHooks.ts');
  assert.match(hooks,/erpKeys\.parts,'page',agencyId,filters/);
  assert.match(hooks,/\['purchase-orders',agencyId,'page',page,7\]/);
  assert.match(hooks,/\['parts',id,'movements',agencyId,filters\]/);
});

test('Lot 2: filtres Pièces et mouvements remettent réellement la page à un',()=>{
  const parts=read('modules/parts/SparePartsPage.tsx'),detail=read('modules/parts/SparePartDetailPage.tsx');
  assert.match(parts,/setPartPage\(1\).*\[debounced,category,low,agency\?\.id\]/);
  assert.match(detail,/setMovementPage\(1\).*filters\.type,filters\.from,filters\.to,filters\.locationId/);
});

test('Lot 2: KPI Pièces viennent du résumé global et les actions métier restent présentes',()=>{
  const page=read('modules/parts/SparePartsPage.tsx');
  for(const field of ['referenceCount','stockValue','lowStockCount','pendingOrderQuantity'])assert.match(page,new RegExp(`summary\\.${field}`));
  for(const action of ['useCreatePart','useCreatePurchaseOrder','usePurchaseOrderStatus','useReceivePurchaseOrder'])assert.match(page,new RegExp(action));
});
