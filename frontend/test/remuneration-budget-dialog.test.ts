import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page=readFileSync(new URL('../src/modules/hr/RemunerationsAdministration.tsx',import.meta.url),'utf8');
const dialog=readFileSync(new URL('../src/components/ui/BusinessDialog.tsx',import.meta.url),'utf8');

test('REM-BUD-01/08/09 distingue chargement, erreur, vide et succès',()=>{
  assert.match(page,/compatible-budgets/);
  assert.match(page,/compatibleBudgets\.isLoading/);
  assert.match(page,/compatibleBudgets\.isError/);
  assert.match(page,/compatibleBudgets\.isSuccess&&!compatibleBudgets\.data\.length/);
  assert.match(page,/qc\.invalidateQueries\(\{queryKey:\['hr'\]\}\)/);
  assert.doesNotMatch(page,/useBudgetsQuery\(can\('hr\.budget\.view'\)\)/);
});

test('MOD-ASYNC-01..08 maintient le dialogue transactionnel et les valeurs',()=>{
  assert.match(dialog,/execute\?:\(value:string\|boolean\)=>Promise<void>/);
  assert.match(dialog,/if\(!request\|\|pending\)return/);
  assert.match(dialog,/await request\.execute\(result\)/);
  assert.match(dialog,/setError\(reason instanceof Error/);
  assert.match(dialog,/disabled=\{pending\}/);
  assert.match(dialog,/if\(!pending\)resolve/);
});

test('les opérations sensibles migrées utilisent le dialogue transactionnel',()=>{
  const files=['BudgetExpenseDisbursement.tsx','../users/UsersManagementPage.tsx','../workshop/WorkshopPlanningPage.tsx'];
  const sources=files.map(file=>readFileSync(new URL(`../src/modules/hr/${file}`,import.meta.url),'utf8')).join('\n');
  assert.match(sources,/confirmMutationAction/);
});
