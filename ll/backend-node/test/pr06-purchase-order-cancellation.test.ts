import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('PR-06 verrouille commande et lignes, conserve stock et motif',async()=>{
  const source=await readFile(new URL('../src/modules/parts/part.routes.ts',import.meta.url),'utf8');
  const route=source.slice(source.indexOf("partRouter.patch('/purchase-orders/:id/status'"),source.indexOf("partRouter.post('/purchase-orders/:id/receipts'"));
  assert.match(route,/parts\.purchase_order\.approve|authorize\(\.\.\.ORDER\)/);
  assert.match(route,/purchase_orders WHERE id=\? AND agency_id=\? FOR UPDATE/);
  assert.match(route,/purchase_order_items WHERE purchase_order_id=\? FOR UPDATE/);
  assert.match(route,/totalement réceptionnée/);
  assert.match(route,/cancelledRemainder/);
  assert.match(route,/\[ANNULATION/);
  assert.doesNotMatch(route,/DELETE FROM/);
  assert.doesNotMatch(route,/part_stocks|part_movements/);
});
