import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const hr = read("src/modules/hr/hr.routes.ts");
const remuneration = read("src/modules/hr/hr-remuneration.routes.ts");

test("la clôture verrouille et refuse les demandes financières non résolues", () => {
  assert.match(hr, /\["draft", "submitted"\]\.includes\(String\(x\.approval_status\)\)/);
  assert.match(hr, /FROM budget_expenses WHERE budget_id=\? FOR UPDATE/);
  assert.match(hr, /FROM budget_fund_requests WHERE budget_id=\? FOR UPDATE/);
  assert.match(hr, /FROM treasury_reservations tr JOIN budget_expenses e ON e\.id=tr\.budget_expense_id WHERE e\.budget_id=\? FOR UPDATE/);
  assert.match(hr, /decision_reason=\?/);
  assert.doesNotMatch(hr, /approval_status IN \('draft','submitted','rejected'\)/);
});

test("une dépense n'est éditable qu'en brouillon ou rejetée", () => {
  assert.match(hr, /\["draft", "rejected"\]\.includes\(String\(current\.approval_status\)\)/);
});

test("la préparation des rémunérations explique les exclusions", () => {
  for (const diagnostic of [
    "inactive",
    "noActiveContract",
    "noApplicableSalary",
    "alreadyPrepared",
    "totalExcluded",
  ]) assert.match(remuneration, new RegExp(diagnostic));
});
