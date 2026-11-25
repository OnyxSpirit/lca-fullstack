import assert from'node:assert/strict';
import test from'node:test';
import{readContractFileSync as readFileSync}from'./helpers/source-contract.js';

const routes=readFileSync(new URL('../src/modules/hr/hr.routes.ts',import.meta.url),'utf8'),remuneration=readFileSync(new URL('../src/modules/hr/hr-remuneration.routes.ts',import.meta.url),'utf8'),contributions=readFileSync(new URL('../src/modules/hr/hr-contribution.routes.ts',import.meta.url),'utf8');

test('EVO-39 vérifie le coût total côté serveur et conserve le coût par acquisition',()=>{assert.match(routes,/Number\(quantity\) \* Number\(unitCost\)/);assert.match(routes,/unit_acquisition_cost,total_acquisition_cost/);assert.match(routes,/Prix unitaire d’acquisition/)});
test('EVO-40 sérialise affectation et retour et refuse les dépassements',()=>{assert.match(routes,/FOR UPDATE[\s\S]{0,500}Stock disponible insuffisant/);assert.match(routes,/returned_quantity[\s\S]{0,500}dépasse la quantité encore affectée/);assert.match(routes,/salaryDeductionCreated:false/)});
test('EVO-41 protège une référence comptable unique et audite les modifications',()=>{assert.match(routes,/accounting-reference/);assert.match(routes,/hr\.stock\.acquisition\.manage/);assert.match(routes,/ER_DUP_ENTRY[\s\S]{0,200}référence comptable est déjà associée/);assert.match(routes,/stock\.acquisition\.accounting_reference\.updated/)});
test('EVO-38 conserve les snapshots et ne déduit pas la part patronale',()=>{assert.match(remuneration,/payable=Math\.round\(\(gross-leaveDeduction-employeeContribution\)/);assert.match(remuneration,/hr_remuneration_contributions/);assert.match(remuneration,/employer_contribution_amount/);assert.match(contributions,/PERCENTAGE[\s\S]{0,400}value>100/)});
