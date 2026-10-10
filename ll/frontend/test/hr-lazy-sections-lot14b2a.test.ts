import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const page=readFileSync(new URL('../src/modules/hr/HrAdministrationPage.tsx',import.meta.url),'utf8');

test('LOT14B2A-01 les sous-arbres RH lourds utilisent des imports dynamiques ciblés',()=>{
  for(const component of ['LeavesAdministration','BonusesAdministration','EmployeeRecordModal','BudgetExpenseDisbursement']){
    assert.match(page,new RegExp(`const ${component}=lazy\\(\\(\\)=>import\\(`));
    assert.doesNotMatch(page,new RegExp(`import\\{${component}\\}from`));
  }
});

test('LOT14B2A-02 la vue d’ensemble reste immédiate et les onglets sensibles restent permissionnés',()=>{
  assert.match(page,/tab==='overview'&&<HrOverviewDashboard/);
  for(const permission of ['hr.employees.view','hr.leave.view','hr.bonus.view','hr.salary.view','hr.stock.view','hr.budget.view','hr.reporting.view']){
    assert.match(page,new RegExp(permission.replaceAll('.','\\.')));
  }
});

test('LOT14B2A-03 les états qui doivent survivre aux chargements restent dans le parent',()=>{
  for(const state of ['tab,setTab','search,setSearch','status,setStatus','agencyId,setAgencyId','page,setPage','selectedEmployee,setSelectedEmployee','selectedStock,setSelectedStock','selectedBudget,setSelectedBudget','modal,setModal']){
    assert.match(page,new RegExp(`\\[${state.replace(',','\\s*,\\s*')}\\]=useState`));
  }
});

test('LOT14B2A-04 le fallback local est accessible et ne bloque que la section',()=>{
  assert.match(page,/const HrSectionBoundary=/);
  assert.match(page,/Suspense fallback=/);
  assert.match(page,/role="status" aria-live="polite"/);
  assert.match(page,/Chargement de la section RH…/);
});

test('LOT14B2A-05 les composants modaux ne sont montés et téléchargés qu’à leur ouverture',()=>{
  assert.match(page,/active=\{modal==='employee-record'\}/);
  assert.match(page,/active=\{modal==='expense-disbursement'\}/);
});
