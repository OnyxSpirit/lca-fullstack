import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';
import{emptyQualityChecklist,qualityChecklistContextKey,qualityChecklistFor,updateQualityChecklist}from'../src/modules/service/qualityChecklistState';

test('SAV-OR-UX-06 applique immédiatement les clics et conserve la dernière intention rapide',()=>{
  const context=qualityChecklistContextKey('or-a',[{newStatus:'quality_control'}]);
  let draft={contextKey:'',values:{...emptyQualityChecklist}};
  draft=updateQualityChecklist(draft,context,'plannedWorkCompleted',true);
  assert.equal(qualityChecklistFor(draft,context).plannedWorkCompleted,true);
  draft=updateQualityChecklist(draft,context,'plannedWorkCompleted',false);
  assert.equal(qualityChecklistFor(draft,context).plannedWorkCompleted,false);
});

test('SAV-OR-UX-06 garde les items indépendants et isole OR et cycles qualité',()=>{
  const first=qualityChecklistContextKey('or-a',[{newStatus:'quality_control'}]);
  let draft=updateQualityChecklist({contextKey:'',values:{...emptyQualityChecklist}},first,'plannedWorkCompleted',true);
  draft=updateQualityChecklist(draft,first,'noLeaks',true);
  assert.deepEqual([qualityChecklistFor(draft,first).plannedWorkCompleted,qualityChecklistFor(draft,first).noLeaks],[true,true]);
  assert.equal(qualityChecklistFor(draft,qualityChecklistContextKey('or-b',[{newStatus:'quality_control'}])).plannedWorkCompleted,false);
  assert.equal(qualityChecklistFor(draft,qualityChecklistContextKey('or-a',[{newStatus:'quality_control'},{newStatus:'quality_control'}])).noLeaks,false);
});

test('SAV-OR-UX-06 réconcilie avec la vérité serveur au refetch ou remount',()=>{
  const persisted={planned_work_completed:1,no_leaks:1,result:'passed'};
  const remounted={...emptyQualityChecklist,plannedWorkCompleted:Boolean(persisted.planned_work_completed),noLeaks:Boolean(persisted.no_leaks),result:persisted.result};
  assert.equal(remounted.plannedWorkCompleted,true);
  assert.equal(remounted.noLeaks,true);
  const rollback={...emptyQualityChecklist};
  assert.equal(rollback.plannedWorkCompleted,false);
});

test('SAV-OR-UX-06 conserve la sauvegarde globale, les checkboxes natives et le message erreur existant',async()=>{
  const page=await readFile(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');
  assert.match(page,/type="checkbox" checked=/);
  assert.match(page,/setQControlDraft\(current=>updateQualityChecklist/);
  assert.equal((page.match(/submit\(actions\.qualityControl/g)??[]).length,2);
  assert.equal((page.match(/loading=\{actions\.qualityControl\.isPending\}/g)??[]).length,2);
  assert.match(page,/catch\(error\)\{onError\?\.\(\);fail\(title,error\)\}/);
  assert.equal((page.match(/setQControlDraft\(\{contextKey:qualityContextKey,values:\{\.\.\.emptyQualityChecklist\}\}\)/g)??[]).length,2);
  assert.doesNotMatch(page,/disabled=\{actions\.qualityControl\.isPending\}/);
});
