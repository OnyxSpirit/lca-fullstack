import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { transactionWithDeadlockRetry } from "../../config/database.js";
import { HttpError } from "../../shared/http-error.js";

export type HistoricalPaymentRecoveryCandidate = {
  paymentId: string;
  paymentNumber: string;
  invoiceId: string;
  agencyId: string;
  amount: number;
  currencyCode: string;
  paymentMethodId: string;
  treasuryAccountId: string | null;
  actorId: string | null;
  paymentDate: string;
  decision: "RECOVERABLE" | "ALREADY_RECOVERED" | "INCOHERENT";
  reason: string | null;
};

const selectCandidate = async (connection: PoolConnection, paymentId: string, lock = false) => {
  const [rows] = await connection.execute<RowDataPacket[]>(`SELECT
      p.id payment_id,p.payment_number,p.invoice_id,p.payment_method_id,p.received_by,p.amount,p.payment_date,p.status,
      i.agency_id,i.currency_code,
      tm.id movement_id,
      m.treasury_account_id,m.is_active mapping_active,
      ta.is_active account_active,ta.agency_id account_agency_id,ta.currency_code account_currency,
      fc.is_ready,fc.activated_at
    FROM payments p
    JOIN invoices i ON i.id=p.invoice_id
    JOIN agencies a ON a.id=i.agency_id
    LEFT JOIN treasury_movements tm ON tm.source_type='PAYMENT' AND tm.source_id=CAST(p.id AS CHAR) COLLATE utf8mb4_unicode_ci AND tm.event_type='CONFIRMED'
    LEFT JOIN treasury_account_mappings m ON m.agency_id=i.agency_id AND m.payment_method_id=p.payment_method_id
    LEFT JOIN treasury_accounts ta ON ta.id=m.treasury_account_id
    LEFT JOIN treasury_flow_configurations fc ON fc.concession_id=a.concession_id
    WHERE p.id=?${lock ? " FOR UPDATE" : ""}`, [paymentId]);
  const row = rows[0];
  if (!row) throw new HttpError(404, "Paiement historique introuvable");
  return row;
};

const classify = (row: RowDataPacket): HistoricalPaymentRecoveryCandidate => {
  let decision: HistoricalPaymentRecoveryCandidate["decision"] = "RECOVERABLE";
  let reason: string | null = null;
  if (row.movement_id) {
    decision = "ALREADY_RECOVERED";
    reason = "Le mouvement de trésorerie existe déjà";
  } else if (row.status !== "confirmed") {
    decision = "INCOHERENT";
    reason = `Le paiement est au statut ${row.status}`;
  } else if (!row.received_by) {
    decision = "INCOHERENT";
    reason = "Aucun acteur historique n’est associé au paiement";
  } else if (!row.treasury_account_id || !row.mapping_active || !row.account_active) {
    decision = "INCOHERENT";
    reason = "La correspondance de trésorerie est absente ou inactive";
  } else if (String(row.account_agency_id ?? "") !== String(row.agency_id)) {
    decision = "INCOHERENT";
    reason = "Le compte de trésorerie n’appartient pas à l’agence du paiement";
  } else if (String(row.account_currency) !== String(row.currency_code)) {
    decision = "INCOHERENT";
    reason = "La devise du compte de trésorerie est incompatible";
  } else if (!row.is_ready || !row.activated_at) {
    decision = "INCOHERENT";
    reason = "L’intégration de trésorerie n’est pas activée";
  }
  return {
    paymentId: String(row.payment_id), paymentNumber: String(row.payment_number), invoiceId: String(row.invoice_id),
    agencyId: String(row.agency_id), amount: Number(row.amount), currencyCode: String(row.currency_code),
    paymentMethodId: String(row.payment_method_id), treasuryAccountId: row.treasury_account_id ? String(row.treasury_account_id) : null,
    actorId: row.received_by ? String(row.received_by) : null, paymentDate: new Date(row.payment_date).toISOString(), decision, reason,
  };
};

export async function simulateHistoricalPaymentRecovery(connection: PoolConnection, paymentId: string) {
  return classify(await selectCandidate(connection, paymentId));
}

export async function applyHistoricalPaymentRecovery(paymentId: string) {
  return transactionWithDeadlockRetry(async connection => {
    const candidate = classify(await selectCandidate(connection, paymentId, true));
    if (candidate.decision === "ALREADY_RECOVERED") return { ...candidate, applied: false, duplicate: true };
    if (candidate.decision !== "RECOVERABLE" || !candidate.treasuryAccountId || !candidate.actorId)
      throw new HttpError(409, candidate.reason ?? "Paiement historique non récupérable");
    const valueDate = candidate.paymentDate.slice(0, 10);
    const [movement] = await connection.execute<any>(`INSERT INTO treasury_movements
      (account_id,direction,amount,currency_code,value_date,description,payment_method_id,reference,source_type,source_id,event_type,created_by)
      VALUES(?,'IN',?,?,?,?,?,?,'PAYMENT',?,'CONFIRMED',?)`, [
      candidate.treasuryAccountId,candidate.amount,candidate.currencyCode,valueDate,
      `Reprise contrôlée de l’encaissement ${candidate.paymentNumber}`,candidate.paymentMethodId,candidate.paymentNumber,candidate.paymentId,candidate.actorId,
    ]);
    const movementId = String(movement.insertId);
    await connection.execute(`INSERT IGNORE INTO accounting_integration_events
      (source_type,source_id,event_type,source_key,agency_id,event_date,currency_code,reference,label,payload,created_by)
      VALUES('PAYMENT',?,'PAYMENT_CONFIRMED',CONCAT('PAYMENT_CONFIRMED:',?),?,?,?,?,?,JSON_OBJECT('amount',?,'treasuryAccountId',?),?)`, [
      candidate.paymentId,candidate.paymentId,candidate.agencyId,valueDate,candidate.currencyCode,candidate.paymentNumber,
      `Encaissement ${candidate.paymentNumber}`,candidate.amount,candidate.treasuryAccountId,candidate.actorId,
    ]);
    await connection.execute(`INSERT INTO audit_logs
      (user_id,agency_id,concession_id,context_mode,module,entity_type,entity_id,action,new_values)
      SELECT ?,a.id,a.concession_id,'EXPLICIT','treasury','payment',?,'HISTORICAL_PAYMENT_RECOVERY',
      JSON_OBJECT('paymentId',?,'movementId',?,'accountId',?,'amount',?) FROM agencies a WHERE a.id=?`, [
      candidate.actorId,candidate.paymentId,candidate.paymentId,movementId,candidate.treasuryAccountId,candidate.amount,candidate.agencyId,
    ]);
    return { ...candidate, movementId, applied: true, duplicate: false };
  });
}
