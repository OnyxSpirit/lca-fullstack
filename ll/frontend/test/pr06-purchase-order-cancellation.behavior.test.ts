import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('PR-06 expose uniquement les actions d’annulation pertinentes',async()=>{
  const page=await readFile(new URL('../src/modules/parts/SparePartsPage.tsx',import.meta.url),'utf8');
  const hooks=await readFile(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');
  assert.match(page,/\['draft','sent','confirmed','partially_received'\]\.includes\(o\.status\)/);
  assert.match(page,/Annuler le reliquat/);
  assert.match(page,/Annuler la commande/);
  assert.match(page,/window\.confirm/);
  assert.match(page,/window\.prompt/);
  assert.match(page,/quantités déjà réceptionnées seront conservées/);
  assert.match(page,/Commandes fournisseurs<\/h2><div className="overflow-x-auto"><table/);
  assert.doesNotMatch(page,/\['received','cancelled'\]\.includes\(o\.status\).*Annuler/s);
  assert.match(hooks,/invalidateQueries\(\{queryKey:\['purchase-orders'\]\}\)/);
});
