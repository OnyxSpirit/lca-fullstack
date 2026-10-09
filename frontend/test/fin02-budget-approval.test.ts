import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const hooks=readFileSync(new URL('../src/api/hrHooks.ts',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/modules/hr/HrAdministrationPage.tsx',import.meta.url),'utf8');

test('FIN-02 expose les statuts français et les mutations de workflow',()=>{
 for(const label of['Brouillon','Soumis','Approuvé','Approuvée','Rejeté','Clôturé','Annulé'])assert.match(page,new RegExp(label));
 for(const action of['budgetSubmit','budgetApprove','budgetReject','budgetClose','expenseSubmit','expenseApprove','expenseReject'])assert.match(hooks,new RegExp(`${action}:useMutation`));
 assert.doesNotMatch(page,/window\.(prompt|confirm)/);
});
