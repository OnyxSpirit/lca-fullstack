import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la clôture budgétaire requiert une confirmation et un motif", () => {
  for (const page of [
    read("src/modules/hr/HrAdministrationPage.tsx"),
    read("src/modules/treasury/BudgetTreasuryPanel.tsx"),
  ]) {
    assert.match(page, /Motif de (?:la )?clôture|motif obligatoire/i);
    assert.match(page, /budgetClose\.mutateAsync\(\{id:/);
  }
});

test("la paie utilise des sélecteurs métier et expose son historique", () => {
  const page = read("src/modules/hr/RemunerationsAdministration.tsx");
  assert.match(page, /useTreasuryAccounts/);
  assert.match(page, /useTreasuryCategories/);
  assert.match(page, /useTreasuryReservations/);
  assert.match(page, /OperationTimeline/);
  assert.doesNotMatch(page, /placeholder=["'](?:Budget|Compte|Catégorie|Réservation) ID/i);
});

test("les réservations et relevés bancaires exposent leur historique", () => {
  const treasury = read("src/modules/treasury/TreasuryPage.tsx");
  const bank = read("src/modules/treasury/BankReconciliationPanel.tsx");
  assert.match(treasury, /useTreasuryReservationHistory/);
  assert.match(treasury, /treasury\.reservation\.adjust/);
  assert.match(bank, /useBankStatementHistory/);
  assert.match(bank, /OperationTimeline/);
});
