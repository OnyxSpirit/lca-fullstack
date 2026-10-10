import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';
import{repairActionCompletion}from'../src/modules/service/repairOrderActionState';

const persisted=(inspection:unknown,diagnostics:unknown[]=[])=>({inspection,diagnostics,approvals:[],qualityControls:[],history:[],invoice:null,handover:null});

test('SAV-OR-UX-03 cumule réception et diagnostic depuis les données serveur après progression et remount',()=>{
  const afterReception=persisted({id:'inspection-1'});
  assert.deepEqual(repairActionCompletion(afterReception),{reception:true,diagnostic:false,approval:false,quality:false,invoice:false,handover:false});
  const afterDiagnostic=persisted({id:'inspection-1'},[{id:'diagnostic-1'}]);
  assert.equal(repairActionCompletion(afterDiagnostic).reception,true);
  assert.equal(repairActionCompletion(afterDiagnostic).diagnostic,true);
  const refetched=structuredClone(afterDiagnostic);
  assert.equal(repairActionCompletion(refetched).reception,true);
  assert.equal(repairActionCompletion(refetched).diagnostic,true);
});

test('SAV-OR-UX-03 isole les verrous par OR même pour un même client',()=>{
  const firstOrder=persisted({id:'inspection-or-1'});
  const secondOrder=persisted(null);
  assert.equal(repairActionCompletion(firstOrder).reception,true);
  assert.equal(repairActionCompletion(secondOrder).reception,false);
});

test('SAV-OR-UX-03 autorise un nouveau contrôle uniquement après une nouvelle entrée de phase',()=>{
  const oldControl={controlledAt:'2026-09-20 10:00:00'};
  assert.equal(repairActionCompletion({...persisted(null),qualityControls:[oldControl],history:[{newStatus:'quality_control',changedAt:'2026-09-20 09:00:00'}]}).quality,true);
  assert.equal(repairActionCompletion({...persisted(null),qualityControls:[oldControl],history:[{newStatus:'quality_control',changedAt:'2026-09-20 11:00:00'},{newStatus:'quality_control',changedAt:'2026-09-20 09:00:00'}]}).quality,false);
});

test('SAV-OR-UX-03 conserve pending, retry sur erreur et quantités physiques entières dans la vue',async()=>{
  const page=await readFile(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');
  assert.match(page,/submitting\.current\.has\(actionKey\)/);
  assert.match(page,/finally\{submitting\.current\.delete\(actionKey\)\}/);
  assert.match(page,/loading=\{actions\.inspection\.isPending\}/);
  assert.match(page,/loading=\{actions\.diagnostic\.isPending\}/);
  assert.match(page,/completed\.reception/);
  assert.match(page,/completed\.diagnostic/);
  assert.match(page,/Quantité prévue[^\n]*min="1" step="1"/);
  assert.match(page,/Quantité consommée[^\n]*min="1"[^\n]*step="1"/);
  assert.match(page,/Number\.isInteger\(value\.quantity\)/);
  assert.match(page,/La quantité doit être un nombre entier\./);
});
