import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('SAV-OR-19 affiche toutes les lignes de l’historique sans réduire par OR',async()=>{
  const page=await readFile(new URL('../src/modules/workshop/WorkshopPlanningPage.tsx',import.meta.url),'utf8');
  const hooks=await readFile(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');
  assert.match(page,/Historique des interventions/);
  assert.match(page,/\(historyQuery\.data\?\?\[\]\)\.map\(item=>/);
  assert.doesNotMatch(page,/new Map\([^\n]*repairOrderId/);
  assert.match(page,/item\.technicianName/);
  assert.match(page,/item\.bayNames/);
  assert.match(page,/item\.durationHours/);
  assert.match(hooks,/\/workshop\/interventions\/history/);
});
