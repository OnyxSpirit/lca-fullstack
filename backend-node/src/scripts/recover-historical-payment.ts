import { pool } from "../config/database.js";
import { processEvent } from "../modules/accounting/accounting-integration.service.js";
import { applyHistoricalPaymentRecovery, simulateHistoricalPaymentRecovery } from "../modules/treasury/historical-payment-recovery.service.js";

const args = new Set(process.argv.slice(2));
const value = process.argv.find(argument => argument.startsWith("--payment-id="))?.split("=")[1];
if (!value || !/^[1-9]\d*$/.test(value)) throw new Error("Usage : recover-historical-payment --payment-id=<id> [--apply]");

try {
  if (!args.has("--apply")) {
    const connection = await pool.getConnection();
    try { console.log(JSON.stringify({ mode: "SIMULATION", candidate: await simulateHistoricalPaymentRecovery(connection, value) }, null, 2)); }
    finally { connection.release(); }
  } else {
    const result = await applyHistoricalPaymentRecovery(value);
    const [events] = await pool.execute<any[]>("SELECT id,status FROM accounting_integration_events WHERE source_key=?", [`PAYMENT_CONFIRMED:${value}`]);
    const accounting = events[0] && events[0].status !== "POSTED" ? await processEvent(String(events[0].id), result.actorId ?? undefined) : events[0] ?? null;
    console.log(JSON.stringify({ mode: "APPLICATION", result, accounting }, null, 2));
  }
} finally { await pool.end(); }
