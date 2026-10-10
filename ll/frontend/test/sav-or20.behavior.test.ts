import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('SAV-OR-20 présente le chiffrage avant une validation client read-only',async()=>{
  const page=await readFile(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');
  const preparation=page.indexOf('Préparation et chiffrage'),approval=page.indexOf('Validation client'),execution=page.indexOf('Interventions / pointage');
  assert.ok(preparation>0&&preparation<approval&&approval<execution);
  assert.match(page,/Montant estimatif soumis au client/);
  assert.match(page,/<output className=/);
  assert.doesNotMatch(page,/approval\.approvedAmount/);
  assert.match(page,/Prévision sans réservation, consommation ni mouvement de stock/);
  assert.match(page,/Main-d’œuvre estimée TTC/);
  assert.match(page,/Pièces estimées TTC/);
  assert.match(page,/overflow-x-auto/);
});
