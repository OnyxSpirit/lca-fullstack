import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const routes=readFileSync(new URL('../src/modules/hr/hr.routes.ts',import.meta.url),'utf8');
const treasury=readFileSync(new URL('../src/modules/treasury/treasury.service.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../database/migrations/072_budget_expense_approval_workflows.sql',import.meta.url),'utf8');
const baseline=readFileSync(new URL('../database/baseline/001_initial_schema.sql',import.meta.url),'utf8');

test('BUD-01..10 workflow budget, quatre yeux, motifs et historique',()=>{
 assert.match(routes,/categoryId,'draft',r\.user!\.sub/);
 for(const action of['submit','approve','reject','close'])assert.match(routes,new RegExp(`/hr/budgets/:id/${action}`));
 assert.match(routes,/créateur ne peut pas approuver son propre budget/);
 assert.match(routes,/decisionReason\(r\.body\.reason,'Motif du rejet'\)/);
 assert.match(routes,/budget_approval_history/);
 assert.match(routes,/Seul un budget approuvé peut être clôturé/);
});

test('EXP-01..12 engagement seulement à approbation et verrou budget',()=>{
 for(const action of['submit','approve','reject'])assert.match(routes,new RegExp(`/hr/expenses/:id/${action}`));
 assert.match(routes,/demandeur ne peut pas approuver sa propre dépense/);
 assert.match(routes,/SELECT e\.\*,b\.initial_amount,b\.status[\s\S]*FOR UPDATE/);
 assert.match(routes,/approval_status='approved'/);
 assert.match(routes,/Montant supérieur au budget disponible au moment de l’approbation/);
 assert.match(treasury,/Seule une dépense approuvée peut être décaissée/);
});

test('HIST-01..04 migration additive sans faux décideur ni double engagement',()=>{
 assert.match(migration,/UPDATE budgets SET is_legacy=TRUE WHERE status<>'draft'/);
 assert.match(migration,/UPDATE budget_expenses SET approval_status='approved',is_legacy=TRUE/);
 assert.doesNotMatch(migration,/decided_by\s*=|decided_at\s*=/);
 assert.match(migration,/CREATE TABLE budget_approval_history/);
 assert.doesNotMatch(baseline,/approval_status ENUM/);
 assert.match(migration,/approval_status ENUM\('draft','submitted','approved','rejected','cancelled'\)/);
});

test('RBAC-01..05 permissions granulaires sans nouveau rôle métier',()=>{
 for(const code of['hr.budget.submit','hr.budget.approve','hr.expense.submit','hr.expense.approve','hr.approval.history.view']){
  assert.match(migration,new RegExp(code.replaceAll('.','\\.')));
 }
 assert.doesNotMatch(migration,/INSERT INTO roles/);
 assert.match(routes,/scopeFor\(r,'hr\.expense\.approve'\)/);
});
