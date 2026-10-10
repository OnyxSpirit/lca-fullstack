import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('SAV-OR-11 masque les actions des affectations terminées et annulées',async()=>{
  const source=await readFile(new URL('../src/modules/workshop/WorkshopPlanningPage.tsx',import.meta.url),'utf8');
  assert.match(source,/Affectation terminée — consultation uniquement/);
  assert.ok((source.match(/!\['completed','cancelled'\]\.includes\(selected\.status\)/g)??[]).length>=3);
});

test('SAV-OR-12 affiche les lignes et le récapitulatif financier responsive',async()=>{
  const source=await readFile(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');
  for(const label of ['Sous-total HT','Remises','TVA','Total TTC','Solde restant'])assert.ok(source.includes(label),label);
  assert.match(source,/overflow-x-auto/);
  assert.match(source,/financialSummary\.currencyCode/);
});

test('SAV-OR-13 verrouille le diagnostic futur mais conserve son historique',async()=>{
  const source=await readFile(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');
  assert.match(source,/Disponible après réception du véhicule/);
  assert.match(source,/Étape terminée — consultation de l’historique uniquement/);
  assert.match(source,/ro\.diagnostics\?\.map/);
});
