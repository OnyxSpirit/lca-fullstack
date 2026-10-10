import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { actualBillableState } from '../src/modules/workshop/actual-billable.js';

test('SAV-OR-22 distingue absence, complétude persistée et isolation par OR', () => {
  assert.equal(actualBillableState(2, 0, 0).confirmed, false, 'heures absentes');
  assert.equal(actualBillableState(2, 1, 1).confirmed, false, 'une saisie locale ou une ligne partielle ne suffit pas');
  assert.equal(actualBillableState(2, 2, 2).confirmed, true, 'chaque ligne réelle persistée confirme le réel');
  assert.equal(actualBillableState(0, 0, 0).confirmed, false, 'fallback historique jamais enregistré');
  assert.equal(actualBillableState(0, 0, 1).confirmed, true, 'action persistée du fallback historique');
  assert.equal(actualBillableState(1, 0, 0).confirmed, false, 'annuler la ligne active invalide la confirmation');
  const orderA = actualBillableState(1, 1, 1);
  const orderB = actualBillableState(1, 0, 0);
  assert.equal(orderA.confirmed, true);
  assert.equal(orderB.confirmed, false);
});

test('SAV-OR-22 protège la transition API directe sous verrou transactionnel', async () => {
  const route = await readFile(new URL('../src/modules/workshop/workshop.routes.ts', import.meta.url), 'utf8');
  assert.match(route, /if\(next==='quality_control'\)/);
  assert.match(route, /SELECT \* FROM repair_orders WHERE id=\? FOR UPDATE/);
  assert.match(route, /repair_order_estimate_items/);
  assert.match(route, /repair_order_items/);
  assert.match(route, /!Number\.isFinite\(qty\) \|\| qty <= 0/);
  assert.match(route, /if\(!billable\.confirmed\)throw new HttpError\(409,'Complétez et validez le réel facturable avant de passer au contrôle qualité'\)/);
  assert.doesNotMatch(route, /billable[^\n]*(?:total|subtotal)[^\n]*[<>]=?\s*0/i);
});
