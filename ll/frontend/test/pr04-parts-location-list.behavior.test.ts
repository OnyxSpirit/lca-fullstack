import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('PR-04 affiche un emplacement, plusieurs emplacements ou Non affecté depuis stocks',async()=>{
  const page=await readFile(new URL('../src/modules/parts/SparePartsPage.tsx',import.meta.url),'utf8');
  const hooks=await readFile(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');
  assert.match(page,/p\.stocks\?\.length\?p\.stocks\.length===1\?p\.stocks\[0\]\.locationName:`\$\{p\.stocks\.length\} emplacements`:'Non affecté'/);
  assert.match(hooks,/stocks: \(r\.stocks\?\?\[\]\)\.map/);
  assert.match(page,/onClick=\{\(\)=>nav\(`\/parts\/\$\{p\.id\}`\)\}/);
});
