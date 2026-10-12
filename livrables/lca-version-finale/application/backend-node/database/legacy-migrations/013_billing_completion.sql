-- Compléments additifs de traçabilité financière et numérotation transactionnelle.
CREATE TABLE document_sequences (
  document_type VARCHAR(30) NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  sequence_year SMALLINT UNSIGNED NOT NULL,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY(document_type,agency_id,sequence_year),
  FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE invoices
  MODIFY COLUMN invoice_type ENUM('vehicle','workshop','parts','accessories','other','manual') NOT NULL,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER notes,
  ADD COLUMN idempotency_key VARCHAR(120) NULL AFTER created_by,
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER idempotency_key,
  ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER cancellation_reason,
  ADD COLUMN cancelled_at DATETIME NULL AFTER cancelled_by,
  ADD UNIQUE KEY uk_invoice_idempotency(idempotency_key),
  ADD INDEX idx_invoice_agency_dates(agency_id,issue_date,due_date,status),
  ADD CONSTRAINT fk_invoice_created_by FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_invoice_cancelled_by FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN idempotency_key VARCHAR(120) NULL AFTER notes,
  ADD COLUMN refund_reason VARCHAR(500) NULL AFTER idempotency_key,
  ADD COLUMN refunded_by BIGINT UNSIGNED NULL AFTER refund_reason,
  ADD COLUMN refunded_at DATETIME NULL AFTER refunded_by,
  ADD UNIQUE KEY uk_payment_idempotency(idempotency_key),
  ADD INDEX idx_payment_invoice_date(invoice_id,payment_date,status),
  ADD CONSTRAINT fk_payment_refunded_by FOREIGN KEY(refunded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE credit_notes
  ADD COLUMN idempotency_key VARCHAR(120) NULL AFTER issue_date,
  ADD UNIQUE KEY uk_credit_note_idempotency(idempotency_key),
  ADD INDEX idx_credit_invoice_date(invoice_id,issue_date,status);
