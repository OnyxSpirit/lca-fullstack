import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('PR-04 enrichit la liste en une requête groupée et conserve le scope agence',async()=>{
  const source=await readFile(new URL('../src/modules/parts/part.routes.ts',import.meta.url),'utf8');
  const list=source.slice(source.indexOf("partRouter.get('/parts'"),source.indexOf("partRouter.get('/parts/:id'"));
  assert.match(list,/FROM part_stocks ps JOIN agencies a.*JOIN locations l/s);
  assert.match(list,/WHERE ps\.agency_id=\?/);
  assert.match(list,/stocksByPart/);
  assert.match(list,/stocks:mayViewStock/);
  assert.doesNotMatch(list,/for\s*\([^)]*rows[^)]*\)\s*\{[^}]*await query/s);
});
