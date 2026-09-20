-- Stabilisation additive Billing pour les bases XAMPP/MariaDB existantes.
-- Cette migration ne supprime et ne renumérote aucune donnée métier.

CREATE TABLE IF NOT EXISTS document_sequences (
  document_type VARCHAR(30) NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  sequence_year SMALLINT UNSIGNED NOT NULL,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (document_type, agency_id, sequence_year),
  CONSTRAINT fk_document_sequence_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE invoices
  MODIFY COLUMN invoice_type ENUM('vehicle','workshop','parts','accessories','other','manual') NOT NULL,
  ADD COLUMN IF NOT EXISTS created_by BIGINT UNSIGNED NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120) NULL AFTER created_by,
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500) NULL AFTER idempotency_key,
  ADD COLUMN IF NOT EXISTS cancelled_by BIGINT UNSIGNED NULL AFTER cancellation_reason,
  ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL AFTER cancelled_by,
  ADD UNIQUE INDEX IF NOT EXISTS uk_invoice_idempotency (idempotency_key),
  ADD INDEX IF NOT EXISTS idx_invoice_agency_dates (agency_id, issue_date, due_date, status),
  ADD CONSTRAINT IF NOT EXISTS fk_invoice_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS fk_invoice_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120) NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(500) NULL AFTER idempotency_key,
  ADD COLUMN IF NOT EXISTS refunded_by BIGINT UNSIGNED NULL AFTER refund_reason,
  ADD COLUMN IF NOT EXISTS refunded_at DATETIME NULL AFTER refunded_by,
  ADD UNIQUE INDEX IF NOT EXISTS uk_payment_idempotency (idempotency_key),
  ADD INDEX IF NOT EXISTS idx_payment_invoice_date (invoice_id, payment_date, status),
  ADD CONSTRAINT IF NOT EXISTS fk_payment_refunded_by FOREIGN KEY (refunded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120) NULL AFTER issue_date,
  ADD UNIQUE INDEX IF NOT EXISTS uk_credit_note_idempotency (idempotency_key),
  ADD INDEX IF NOT EXISTS idx_credit_invoice_date (invoice_id, issue_date, status);
