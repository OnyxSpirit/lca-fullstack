import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("TRES-01 filtre les dépenses éligibles avec le compte et son scope", () => {
  const service = read("modules/treasury/treasury-coverage.service.ts");
  const routes = read("modules/treasury/treasury.routes.ts");
  assert.match(routes, /eligibleExpenses\(r,r\.query\.accountId\)/);
  assert.match(service, /c\.id=\? AND c\.currency_code=\?/);
  assert.match(service, /b\.scope_type<>'agency' OR \?='CONCESSION' OR \(\?='AGENCY' AND b\.agency_id=\?\)/);
  assert.match(service, /HAVING available_amount>0/);
});

test("TRES-05 revalide le reste réservable et la liquidité dans la transaction", () => {
  const service = read("modules/treasury/treasury-coverage.service.ts");
  assert.match(service, /expenseAvailable\(c, expenseId\)/);
  assert.match(service, /accountAvailable\(c, accountId\)/);
  assert.match(service, /Montant supérieur au reste réservable/);
  assert.match(service, /Liquidités librement disponibles insuffisantes/);
});

test("TRES-04 le transfert déduit les réservations actives sous verrouillage", () => {
  const service = read("modules/treasury/treasury.service.ts");
  assert.match(service, /ORDER BY id FOR UPDATE/);
  assert.match(service, /SUM\(active_amount\).*status='ACTIVE'/s);
  assert.match(service, /value > available/);
});

test("TRES-03 export français, UTF-8 et protégé contre les formules", () => {
  const routes = read("modules/treasury/treasury.routes.ts");
  const csv = read("modules/reports/report.csv.ts");
  for (const label of ["Type d’opération", "Référence", "Entrée", "Sortie", "Statut"])
    assert.match(routes, new RegExp(label));
  assert.match(csv, /\\ufeff/);
  assert.match(csv, /\[=\+\\-@\]/);
});
