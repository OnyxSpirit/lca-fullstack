import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const route=readFileSync(new URL('../src/modules/hr/hr.routes.ts',import.meta.url),'utf8');
const baseline=readFileSync(new URL('../database/baseline/001_initial_schema.sql',import.meta.url),'utf8');

test('HR-EMPTY-01 la baseline fraîche contient tout le schéma RH 042-044',()=>{
  for(const token of ['CREATE TABLE internal_stock_categories','CREATE TABLE budget_categories','CREATE TABLE budget_fund_movements','category_id BIGINT UNSIGNED NULL','fk_internal_stock_item_category','fk_budget_category','fk_budget_expense_category'])assert.match(baseline,new RegExp(token));
  assert.doesNotMatch(route,/INFORMATION_SCHEMA\.COLUMNS|hrAggregateSchema/);
});

test('HR-EMPTY-02/03 les agrégats numériques et collections vides gardent leur contrat',()=>{
  for(const expression of ['COALESCE(SUM(sh.amount),0)','COUNT(*) items','COALESCE(SUM(i.current_quantity<=i.minimum_quantity),0)','COALESCE(SUM(b.initial_amount+(SELECT COALESCE(SUM(f.amount),0)'])assert.ok(route.includes(expression),expression);
  assert.match(route,/result\.headcountByAgency=rows\.map/);
  assert.match(route,/out\.headcount=rows\.map/);
  assert.match(route,/out\.payroll=rows\.map/);
  assert.match(route,/out\.stock=rows\.map/);
  assert.match(route,/out\.budgets=rows\.map/);
  assert.match(route,/out\.expenseCategories=categoryRows\.map/);
  assert.match(route,/out\.expenseTrend=trendRows\.map/);
});

test('HR-EMPTY-04..08 reporting couvre employés, salaires, stock, budgets et dépenses vides',()=>{
  for(const permission of ['hr.employees.view','hr.salary.view','hr.stock.view','hr.budget.view','hr.expense.view'])assert.ok(route.includes(`if(can(context,'${permission}'))`),permission);
});

test('HR-EMPTY-09..12 RBAC et scopes précèdent toujours les agrégats',()=>{
  assert.match(route,/get\('\/hr\/overview',requirePermission\('hr\.view'\)/);
  assert.match(route,/get\('\/hr\/reporting',requirePermission\('hr\.reporting\.view'\)/);
  assert.match(route,/agencyPredicate\(r,context\.permissions\.get/);
  assert.match(route,/andPredicates\(agencyPredicate/);
  assert.match(route,/andPredicates\(budgetPredicate/);
});

test('HR-EMPTY-13 les erreurs SQL ne sont pas converties en zéros',()=>{
  assert.doesNotMatch(route,/query<[^>]+>\([^)]*\)\.catch\(/);
});

test('HR-EMPTY-14/15 le chemin normal conserve fonds et catégories sans modifier les CRUD RH',()=>{
  assert.match(route,/FROM budget_fund_movements f WHERE f\.budget_id=b\.id/);
  assert.match(route,/LEFT JOIN budget_categories bc ON bc\.id=b\.category_id/);
  for(const path of ['/hr/employees','/hr/employees/:id/salaries','/hr/internal-stock','/hr/budgets/:id/expenses'])assert.ok(route.includes(path),path);
});
