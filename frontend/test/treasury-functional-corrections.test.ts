import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("réservation : compte avant dépense et montant intégral automatique", () => {
  const page = read("modules/treasury/TreasuryPage.tsx");
  assert.match(page, /useTreasuryReservableExpenses\(reservationForm\.accountId/);
  assert.match(page, /available_amount\.toFixed\(2\)/);
  assert.match(page, /readOnly/);
  assert.match(page, /reservationCashInsufficient/);
});

test("transfert : solde, réservations et disponible sont visibles et bornent la soumission", () => {
  const page = read("modules/treasury/TreasuryPage.tsx");
  assert.match(page, /Solde comptable/);
  assert.match(page, /Réservations actives/);
  assert.match(page, /Disponible pour transfert/);
  assert.match(page, /transferAmountInvalid/);
});

test("import bancaire : zone fichier, métadonnées, retrait et erreur visible", () => {
  const panel = read("modules/treasury/BankReconciliationPanel.tsx");
  assert.match(panel, /Choisir un fichier/);
  assert.match(panel, /5 Mo maximum/);
  assert.match(panel, /file\.size\/1024/);
  assert.match(panel, />Retirer</);
  assert.match(panel, /uploadError/);
});

test("journal : aucune référence technique précédée de dièse", () => {
  const page = read("modules/treasury/TreasuryPage.tsx");
  assert.match(page, /businessReference\(m\)/);
  assert.doesNotMatch(page, /sourceLabel\(m\.source_type\) #\{m\.source_id\}/);
});
