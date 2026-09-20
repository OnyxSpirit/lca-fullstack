import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('SAV-OR-20 sépare chiffrage, décision client et exécution réelle',async()=>{
  const route=await readFile(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');
  const migration=await readFile(new URL('../database/migrations/036_repair_order_estimate_items.sql',import.meta.url),'utf8');
  assert.match(migration,/CREATE TABLE repair_order_estimate_items/);
  assert.match(route,/\/repair-orders\/:id\/estimate-items/);
  assert.match(route,/parts\.sale_price|SELECT p\.name,p\.sale_price/);
  assert.match(route,/config\.rates\[rateCode/);
  assert.match(route,/SELECT line_total,tax_rate FROM repair_order_estimate_items WHERE repair_order_id=\? FOR UPDATE/);
  assert.doesNotMatch(route,/const approvedAmount=r\.body\.approvedAmount/);
  assert.match(route,/Le chiffrage soumis au client est verrouillé/);
  assert.match(route,/ro\.status!==['"]in_progress['"].*démarrer une session/);
});
