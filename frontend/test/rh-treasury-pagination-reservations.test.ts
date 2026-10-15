import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("la pagination cliente propose 10, 25 et 50 et borne la page courante", () => {
  const source = read("components/common/ClientPagination.tsx");
  for (const size of [10, 25, 50]) assert.match(source, new RegExp(String(size)));
  assert.match(source, /page>totalPages/);
  assert.match(source, /Précédent/);
  assert.match(source, /Suivant/);
});

test("les cartes budgets RH sont limitées à quatre et indépendantes des dépenses", () => {
  const source = read("modules/hr/HrAdministrationPage.tsx");
  assert.match(source, /useClientPagination\(budgets\.data \?\? \[\], 4/);
  assert.match(source, /budgetPage\.visible/);
  assert.match(source, /useAllExpensesQuery/);
});

test("les listes principales RH et Treasury utilisent des paginations indépendantes", () => {
  const hr = read("modules/hr/HrAdministrationPage.tsx");
  const treasury = read("modules/treasury/TreasuryPage.tsx");
  for (const name of ["stockPage", "movementPage", "salaryPage"]) assert.match(hr, new RegExp(name));
  for (const name of ["overviewAccountsPage", "coverageBudgetsPage", "coverageReservationsPage", "accountsPage", "categoriesPage"]) assert.match(treasury, new RegExp(name));
  for (const [file, names] of [
    ["modules/hr/RemunerationsAdministration.tsx", ["remunerationPage"]],
    ["modules/treasury/BudgetTreasuryPanel.tsx", ["budgetPage", "requestPage"]],
    ["modules/treasury/BankReconciliationPanel.tsx", ["statementPage", "linePage"]],
    ["modules/treasury/TreasuryFlowMappingsTable.tsx", ["mappingPage"]],
  ] as const) {
    const source = read(file);
    for (const name of names) assert.match(source, new RegExp(name));
  }
});

test("le formulaire de réservation distingue chargement, erreur, absence et compatibilité", () => {
  const source = read("modules/treasury/TreasuryPage.tsx");
  assert.match(source, /reservableExpenses\.isLoading/);
  assert.match(source, /reservableExpenses\.isError/);
  assert.match(source, /Aucune dépense approuvée avec un reste à payer non réservé/);
  assert.match(source, /compatibleReservableExpenses/);
  assert.match(source, /reservationActions\.create\.isPending/);
});
