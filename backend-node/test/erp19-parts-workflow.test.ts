import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {partsScopeAllows} from '../src/modules/parts/parts-policy.js';

const workshop=readFileSync(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');
const routeBlock=(start:string,end:string)=>workshop.slice(workshop.indexOf(start),workshop.indexOf(end,workshop.indexOf(start)));

test('ERP19-BE-01 les routes de réservation utilisent le garde Pièces spécialisé',()=>{
  const reserveEstimate=routeBlock('"/repair-orders/:id/estimate-items/:estimateItemId/reserve"','"/repair-orders/:id/parts/reserve"');
  const reserveDirect=routeBlock('"/repair-orders/:id/parts/reserve"','"/repair-orders/:id/parts/reservations/:reservationId"');
  const mutation=routeBlock('"/repair-orders/:id/parts/reservations/:reservationId"','"/repair-orders/:id/invoice"');
  assert.match(reserveEstimate,/partsOrderAccess\('parts\.reservation\.create'\)/);
  assert.match(reserveDirect,/partsOrderAccess\('parts\.reservation\.create'\)/);
  assert.match(mutation,/partsOrderAccess\(reservationMutationPermission\)/);
  for(const block of [reserveEstimate,reserveDirect,mutation])assert.doesNotMatch(block,/serviceAccess\('service\.order\.update'\)/);
});

test('ERP19-BE-02 le garde charge un contexte OR minimal et contrôle le scope spécialisé',()=>{
  assert.match(workshop,/SELECT id,agency_id,status FROM repair_orders WHERE id=\?/);
  assert.match(workshop,/permissionCoversAgency\(r,permission,String\(repairOrder\.agency_id\)\)/);
  assert.match(workshop,/partsOrderContext\.set/);
});

test('ERP19-BE-03 consommation et libération restent deux permissions distinctes',()=>{
  assert.match(workshop,/status==='consumed'\?'parts\.reservation\.consume':'parts\.reservation\.release'/);
  assert.match(workshop,/\['consumed','released'\]\.includes\(status\)/);
});

test('ERP19-BE-04 OWN ne couvre jamais le stock collectif',()=>{
  assert.equal(partsScopeAllows('OWN','1','1'),false);
  assert.equal(partsScopeAllows('AGENCY','1','1'),true);
  assert.equal(partsScopeAllows('AGENCY','1','2'),false);
  assert.equal(partsScopeAllows('CONCESSION','1','2',true),true);
  assert.equal(partsScopeAllows('GLOBAL','1','99'),true);
});

test('ERP19-BE-05 les chemins historiques restent doublement protégés',()=>{
  const directItems=routeBlock('"/repair-orders/:id/items"',"workshopRouter.patch('/repair-orders/:id/items/:itemId'");
  assert.match(directItems,/serviceAccess\('service\.order\.update'\),requirePartsStockAccess/);
  assert.match(workshop,/await assertPermission\(r,'parts\.stock\.adjust'\)/);
});

test('ERP19-BE-06 verrous, idempotence et mouvements de stock sont conservés',()=>{
  for(const marker of ['FOR UPDATE','request_key','reserved_stock=reserved_stock+?','reserved_stock=reserved_stock-?,current_stock=current_stock-?'])assert.equal(workshop.includes(marker),true,marker);
  const reserveEstimate=routeBlock('"/repair-orders/:id/estimate-items/:estimateItemId/reserve"','"/repair-orders/:id/parts/reserve"');
  const reserveDirect=routeBlock('"/repair-orders/:id/parts/reserve"','"/repair-orders/:id/parts/reservations/:reservationId"');
  for(const block of [reserveEstimate,reserveDirect])assert.match(block,/transactionWithDeadlockRetry/);
});

test('ERP19-BE-07 la file Pièces est minimale et scopée par reservation.view',()=>{
  assert.match(workshop,/parts-work-queue',requirePermission\('parts\.reservation\.view'\)/);
  assert.match(workshop,/parts-work-queue\/:id',partsOrderAccess\('parts\.reservation\.view'\)/);
  const queue=routeBlock("'/parts-work-queue'","'/parts-work-queue/:id'");
  assert.doesNotMatch(queue,/customer|vehicle|phone/i);
  assert.match(queue,/partsQueueScope/);
});
