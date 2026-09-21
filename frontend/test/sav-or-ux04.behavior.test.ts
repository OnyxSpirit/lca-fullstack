import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const loadPage=()=>readFile(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');

test('SAV-OR-UX-04 restitue le workflow dans son ordre métier strict',async()=>{
  const page=await loadPage();
  const steps=[
    'Réception véhicule',
    '<CardTitle>Diagnostic</CardTitle>',
    'Préparation et chiffrage',
    'Validation client',
    'Affectation atelier',
    'Interventions / pointage',
    'Pièces et main-d’œuvre',
    'Réel facturable',
    'Contrôle qualité',
    'Récapitulatif final',
    '<CardTitle>Facturation</CardTitle>',
    'Remise / clôture',
  ];
  const positions=steps.map(step=>page.indexOf(step));
  assert.ok(positions.every(position=>position>=0));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
});

test('SAV-OR-UX-04 ne propose le réel facturable que dans son étape dédiée',async()=>{
  const page=await loadPage();
  const section=page.indexOf('<CardTitle>Réel facturable</CardTitle>');
  const actions=[...page.matchAll(/Définir le facturable/g)].map(match=>match.index??-1);
  assert.equal(actions.length,1);
  assert.ok(actions[0]>section);
});

test('SAV-OR-UX-04 préserve les verrous persistants SAV-OR-UX-03',async()=>{
  const page=await loadPage();
  assert.match(page,/repairActionCompletion\(ro\)/);
  assert.match(page,/!completed\.reception/);
  assert.match(page,/!completed\.diagnostic/);
  assert.match(page,/!completed\.approval/);
  assert.match(page,/!completed\.quality/);
  assert.match(page,/if\(submitting\.current\.has\(actionKey\)\)return/);
  assert.match(page,/finally\{submitting\.current\.delete\(actionKey\)\}/);
});
