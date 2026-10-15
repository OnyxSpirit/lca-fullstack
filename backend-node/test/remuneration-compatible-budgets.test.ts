import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../src/modules/hr/hr-remuneration.routes.ts',import.meta.url),'utf8');

test('REM-BUD-01 utilise une source dédiée indépendante de hr.budget.view',()=>{
  assert.match(source,/compatible-budgets/);
  assert.match(source,/requirePermission\('hr\.remuneration\.engage'\)/);
  assert.match(source,/assertPermission\(r,'hr\.expense\.create'\)/);
  assert.doesNotMatch(source,/compatible-budgets[^\n]+hr\.budget\.view/);
});

test('REM-BUD-02..05 applique les mêmes critères financiers que l’imputation',()=>{
  for(const contract of ["b.status='active'","target_concession_id","b.scope_type<>'agency'","c.currency_code=?","b.start_date<=?","b.end_date>=?","HAVING remaining>=?"])
    assert.ok(source.includes(contract),contract);
  assert.match(source,/budgetScope\(r,expenseScope\)/);
});

test('REM-BUD-06/07/10 conserve verrou, unicité et absence de décaissement',()=>{
  assert.match(source,/FOR UPDATE/);
  assert.match(source,/x\.budget_expense_id/);
  assert.match(source,/INSERT INTO budget_expenses/);
  const engage=source.slice(source.indexOf("post('/hr/remunerations/:id/engage'"),source.indexOf("post('/hr/remunerations/:id/payments'"));
  assert.doesNotMatch(engage,/budgetExpenseDisburse|treasury_movements|INSERT INTO budget_expense_disbursements/);
});
