import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const routes = read("src/modules/hr/hr.routes.ts");
const migration = read("database/migrations/086_hr_expense_cancel_permission.sql");

test("l'annulation possède une permission dynamique dédiée sans attribution de rôle", () => {
  assert.match(routes, /\/hr\/expenses\/:id\/cancel[\s\S]*requirePermission\("hr\.expense\.cancel"\)/);
  assert.match(routes, /scopeFor\(r, "hr\.expense\.cancel"\)/);
  assert.match(migration, /'hr\.expense\.cancel'/);
  assert.doesNotMatch(migration, /role_permissions/);
});

test("l'annulation verrouille la dépense et les réservations puis conserve sa trace", () => {
  assert.match(routes, /WHERE e\.id=\? AND \$\{p\.sql\} FOR UPDATE/);
  assert.match(routes, /treasury_reservations WHERE budget_expense_id=\? AND status IN\('SUBMITTED','ACTIVE'\) FOR UPDATE/);
  assert.match(routes, /approval_status='cancelled',decided_by=\?,decided_at=NOW\(\),decision_reason=\?/);
  assert.match(routes, /approvalHistory[\s\S]*"cancelled"/);
  assert.match(routes, /"expense\.cancelled"/);
  assert.doesNotMatch(routes, /DELETE FROM budget_expenses/);
});

test("les blocages financiers distinguent réservation, paiement partiel, total et double annulation", () => {
  for (const message of [
    "réservation de liquidités active",
    "partiellement décaissée",
    "totalement décaissée",
    "déjà annulée",
  ]) assert.ok(routes.includes(message), message);
  assert.match(routes, /SUM\(CASE WHEN reversal\.id IS NULL THEN d\.amount ELSE 0 END\)/);
});

test("les KPI distinguent engagement et décaissement financier effectif", () => {
  assert.match(routes, /approval_status='approved'/);
  assert.match(routes, /original\.source_type='BUDGET_EXPENSE_DISBURSEMENT'/);
  assert.match(routes, /original\.event_type='POSTED'/);
  assert.match(routes, /LEFT JOIN treasury_movements reversal ON reversal\.reversal_of_id=original\.id/);
  assert.match(routes, /disbursedExpenses=disbursed/);
  assert.match(routes, /remainingToDisburse=Math\.max\(0,engaged-disbursed\)/);
  assert.match(routes, /remainingBudget = total - engaged/);
});

test("temps réel et notifications sont déclenchés après la transaction", () => {
  const transactionEnd = routes.indexOf("emitToAgenciesAndGlobals(result.agencyIds,'hr:expense-updated'");
  const update = routes.indexOf("UPDATE budget_expenses SET approval_status='cancelled'");
  assert.ok(transactionEnd > update);
  assert.match(routes, /notifyPermissions\(\{[\s\S]*permissions:\['hr\.expense\.view'\][\s\S]*eventKey:`hr\.expense\.cancelled:\$\{expenseId\}`/);
});
