import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('SAV-OR-19 conserve une ligne historique par intervention et le RBAC dynamique',async()=>{
  const route=await readFile(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');
  assert.match(route,/\/workshop\/interventions\/history/);
  assert.match(route,/workshopAuthorize\('workshop\.intervention\.view'\)/);
  assert.match(route,/FROM interventions i JOIN repair_orders ro/);
  assert.match(route,/ORDER BY i\.id DESC/);
  assert.doesNotMatch(route,/GROUP BY i\.repair_order_id/);
  assert.match(route,/permission==='OWN'.*i\.technician_id/);
});
