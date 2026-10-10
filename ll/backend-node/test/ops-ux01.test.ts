import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('OPS-UX-01 refuse les quantités physiques décimales côté API',async()=>{
  const [parts,workshop]=await Promise.all([read('../src/modules/parts/part.routes.ts'),read('../src/modules/workshop/workshop.routes.ts')]);
  assert.match(parts,/Number\.isInteger\(quantity\)/);
  for(const label of ['quantité commandée','quantité reçue','quantité comptée'])assert.match(parts,new RegExp(label,'i'));
  assert.match(workshop,/assertPhysicalInteger/);
  assert.match(workshop,/itemType==='part'/);
  assert.match(workshop,/status==='consumed'/);
});

test('OPS-UX-01 conserve les décimales de durée et de finance',async()=>{
  const [parts,workshop]=await Promise.all([read('../src/modules/parts/part.routes.ts'),read('../src/modules/workshop/workshop.routes.ts')]);
  assert.match(parts,/num\(x\.unitPrice,'Prix achat'\)/);
  assert.match(parts,/num\(x\.taxRate\?\?0,'Taxe'\)/);
  assert.match(workshop,/Number\.isFinite\(hours\).*hours<=0/);
  assert.doesNotMatch(workshop,/Number\.isInteger\(hours\)/);
});

test('OPS-UX-01 conserve les verrous et idempotences métier',async()=>{
  const [parts,workshop]=await Promise.all([read('../src/modules/parts/part.routes.ts'),read('../src/modules/workshop/workshop.routes.ts')]);
  assert.match(parts,/purchase_order_receipts WHERE purchase_order_id=\? AND idempotency_key=\?/);
  assert.match(parts,/FOR UPDATE/);
  assert.match(workshop,/SELECT id FROM interventions WHERE estimate_item_id=\? FOR UPDATE/);
  assert.match(workshop,/SELECT id FROM repair_approvals WHERE repair_order_id=\? LIMIT 1 FOR UPDATE/);
});
