import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path: string) => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('SAV-OR-22 bloque le bouton qualité depuis l’état serveur et explique la raison', async () => {
  const [page, hooks, types] = await Promise.all([
    source('modules/service/RepairOrderDetailPage.tsx'),
    source('api/erpHooks.ts'),
    source('types/index.ts'),
  ]);
  assert.match(types, /actualBillable:\{expectedItems:number;confirmedItems:number;confirmed:boolean\}/);
  assert.match(hooks, /confirmed:Boolean\(r\.actualBillable\?\.confirmed\)/);
  assert.match(page, /qualityTransitionBlocked=nextTransitions\.includes\('CONTROLE_QUALITE'\)&&!ro\.actualBillable\.confirmed/);
  assert.match(page, /disabled=\{next==='CONTROLE_QUALITE'&&qualityTransitionBlocked\|\|next==='RECEPTIONNE'&&warrantyDecisionPending\}/);
  assert.match(page, /Complétez et validez le réel facturable avant de passer au contrôle qualité\./);
  assert.doesNotMatch(page, /setActualBillableConfirmed/);
});

test('SAV-OR-22 conserve l’ordre métier SAV', async () => {
  const page = await source('modules/service/RepairOrderDetailPage.tsx');
  const blocks = ['Réception véhicule','Diagnostic','Préparation et chiffrage','Validation client','Affectation atelier','Interventions / pointage','Pièces et main-d’œuvre','Réel facturable','Contrôle qualité','Récapitulatif final','Facturation','Remise / clôture'];
  let cursor = -1;
  for (const block of blocks) {
    const next = page.indexOf(block, cursor + 1);
    assert.ok(next > cursor, `${block} doit rester dans l’ordre`);
    cursor = next;
  }
});
