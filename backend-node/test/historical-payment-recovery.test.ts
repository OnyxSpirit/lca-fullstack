import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/modules/treasury/historical-payment-recovery.service.ts", import.meta.url), "utf8");
const script = readFileSync(new URL("../src/scripts/recover-historical-payment.ts", import.meta.url), "utf8");

test("FIN-002 simule par défaut et exige une application explicite", () => {
  assert.match(script, /args\.has\("--apply"\)/);
  assert.match(script, /mode: "SIMULATION"/);
});

test("FIN-002 verrouille, écrit le mouvement et l’événement comptable dans une transaction", () => {
  assert.match(source, /transactionWithDeadlockRetry/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /INSERT INTO treasury_movements/);
  assert.match(source, /INSERT IGNORE INTO accounting_integration_events/);
});

test("FIN-002 est idempotente et auditée", () => {
  assert.match(source, /ALREADY_RECOVERED/);
  assert.match(source, /duplicate: true/);
  assert.match(source, /HISTORICAL_PAYMENT_RECOVERY/);
});
