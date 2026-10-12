import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const page=readFileSync(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');
const queue=readFileSync(new URL('../src/modules/parts/PartsWorkQueuePage.tsx',import.meta.url),'utf8');

test('ERP19-FE-01 les opérations spécialisées existent sans service.order.update',()=>{
  assert.match(page,/!can\('service\.order\.update'\).*parts\.reservation\.create.*parts\.reservation\.consume.*parts\.reservation\.release/);
  assert.match(page,/Ces actions spécialisées sont indépendantes de la modification générale de l’OR/);
});

test('ERP19-FE-02 chaque action reste conditionnée par sa permission',()=>{
  assert.match(page,/can\('parts\.reservation\.create'\).*reserveEstimatePart/s);
  assert.match(page,/can\('parts\.reservation\.consume'\).*status:'consumed'/s);
  assert.match(page,/can\('parts\.reservation\.release'\).*status:'released'/s);
});

test('ERP19-FE-03 aucune autorisation ne dépend d’un nom de rôle',()=>{
  assert.doesNotMatch(page+queue,/MAGASINIER|RESPONSABLE_PIECES|SUPER_ADMIN/);
});

test('ERP19-FE-04 un profil Pièces dispose d’une file dédiée sans service.order.update',()=>{
  assert.match(queue,/parts\.reservation\.view/);
  assert.match(queue,/parts\.reservation\.create/);
  assert.match(queue,/parts\.reservation\.consume/);
  assert.match(queue,/parts\.reservation\.release/);
  assert.doesNotMatch(queue,/service\.order\.update/);
});
