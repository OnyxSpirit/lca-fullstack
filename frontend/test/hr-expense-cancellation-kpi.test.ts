import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("src/modules/hr/HrAdministrationPage.tsx");
const analytics = read("src/modules/hr/HrAnalytics.tsx");
const hooks = read("src/api/hrHooks.ts");

test("l'action d'annulation est protégée par la permission dédiée", () => {
  assert.match(page, /can\("hr\.expense\.cancel"\)/);
  assert.match(page, /onCancel=\{\(expense\)=>/);
  assert.match(hooks, /\/hr\/expenses\/\$\{id\}\/cancel/);
});

test("la modale confirme les données et conserve un motif contrôlé", () => {
  for (const label of [
    "Annuler la dépense",
    "Référence",
    "Libellé",
    "Montant",
    "Budget",
    "Statut actuel",
    "Motif de l’annulation",
    "Retour",
    "Confirmer l’annulation",
  ]) assert.ok(page.includes(label), label);
  assert.match(page, /required minLength=\{3\} maxLength=\{500\}/);
  assert.match(page, /disabled=\{pending\}/);
  assert.match(page, /pending\?"Annulation…"/);
  assert.match(page, /Dépense annulée avec succès\./);
  assert.doesNotMatch(page, /window\.(?:alert|confirm|prompt)\(/);
});

test("la vue d'ensemble nomme explicitement engagement et décaissement", () => {
  assert.match(hooks, /disbursedExpenses\?:number/);
  assert.match(hooks, /remainingToDisburse\?:number/);
  assert.match(analytics, /engagé/);
  assert.match(analytics, /Dépenses décaissées/);
  assert.match(analytics, /reste à décaisser/);
  assert.match(analytics, /date de valeur des mouvements financiers effectifs/);
});
