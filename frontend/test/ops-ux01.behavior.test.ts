import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('OPS-UX-01 saisit les quantités PR par pas entier sans dégrader prix et taux',async()=>{
  const page=await read('../src/modules/parts/SparePartsPage.tsx');
  assert.match(page,/const whole=\/Quantité\|Stock\//);
  assert.match(page,/step=\{whole\?'1':'0\.01'\}/);
  assert.match(page,/Number\.isInteger\(value\)/);
});

test('OPS-UX-01 contextualise le verrou des actions OR',async()=>{
  const page=await read('../src/modules/service/RepairOrderDetailPage.tsx');
  assert.match(page,/useRef\(new Set<string>\(\)\)/);
  assert.match(page,/estimateItemId/);
  assert.match(page,/interventionId/);
  assert.match(page,/reservationId/);
  assert.match(page,/submitting\.current\.has\(actionKey\)/);
});

test('OPS-UX-01 conserve les indicateurs pending du planning',async()=>{
  const page=await read('../src/modules/workshop/WorkshopPlanningPage.tsx');
  assert.match(page,/loading=\{assignMutation\.isPending\}/);
  assert.match(page,/loading=\{scheduleMutations\.update\.isPending\}/);
  assert.match(page,/loading=\{scheduleMutations\.cancel\.isPending\}/);
  assert.match(page,/loading=\{absenceMutations\.create\.isPending\}/);
  assert.match(page,/removingAbsenceId===item\.id/);
  assert.match(page,/setAttribute\('disabled',''\)/);
  assert.match(page,/disabled=\{scheduleMutations\.update\.isPending\}/);
  assert.match(page,/disabled=\{scheduleMutations\.cancel\.isPending\}/);
});

test('OPS-UX-01 valide explicitement le kilométrage et les quantités OR',async()=>{
  const [create,detail]=await Promise.all([read('../src/modules/service/NewRepairOrderModal.tsx'),read('../src/modules/service/RepairOrderDetailPage.tsx')]);
  assert.match(create,/step="1"/);
  assert.match(create,/Number\.isInteger\(formData\.mileage\)/);
  assert.match(detail,/\['mileage','mileageOut'\]/);
  assert.match(detail,/value\?\.itemType==='part'\|\|value\?\.status==='consumed'/);
});
