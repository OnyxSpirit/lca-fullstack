-- Facturation / encaissements : destination explicite, date technique et annulation traçable.
ALTER TABLE payment_methods
  ADD COLUMN requires_attachment BOOLEAN NOT NULL DEFAULT FALSE AFTER requires_reference;

ALTER TABLE payments
  ADD COLUMN treasury_account_id BIGINT UNSIGNED NULL AFTER payment_method_id,
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER payment_date,
  ADD KEY idx_payment_created_status(created_at,status,id),
  ADD KEY idx_payment_treasury_account(treasury_account_id),
  ADD CONSTRAINT fk_payment_treasury_account FOREIGN KEY(treasury_account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT;

-- Une compatibilite est desormais un triplet exact, et non un compte unique par moyen/agence.
ALTER TABLE treasury_account_mappings
  DROP INDEX uq_treasury_mapping_context,
  ADD UNIQUE KEY uq_treasury_mapping_destination(agency_id,payment_method_id,treasury_account_id),
  ADD KEY idx_treasury_mapping_payment_destination(agency_id,payment_method_id,is_active,treasury_account_id);

-- Reprise uniquement lorsque le mouvement financier originel est unique et non ambigu.
UPDATE payments p
JOIN (
  SELECT CAST(source_id AS UNSIGNED) payment_id,MIN(account_id) account_id
  FROM treasury_movements
  WHERE source_type='PAYMENT' AND event_type='CONFIRMED' AND status='POSTED'
  GROUP BY CAST(source_id AS UNSIGNED)
  HAVING COUNT(*)=1 AND COUNT(DISTINCT account_id)=1
) origin ON origin.payment_id=p.id
SET p.treasury_account_id=origin.account_id
WHERE p.treasury_account_id IS NULL;

CREATE TABLE payment_cancellations(
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  cancelled_by BIGINT UNSIGNED NOT NULL,
  cancelled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_cancellation_payment(payment_id),
  UNIQUE KEY uq_payment_cancellation_idempotency(idempotency_key),
  KEY idx_payment_cancellation_invoice(invoice_id,cancelled_at),
  CONSTRAINT fk_payment_cancellation_payment FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_cancellation_invoice FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_cancellation_user FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_payment_cancellation_reason CHECK(CHAR_LENGTH(TRIM(reason))>0)
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,category,description,is_active)
VALUES('billing','update','billing.payment.cancel','Annuler un règlement','Facturation','Contrepasser un règlement confirmé saisi par erreur',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=TRUE;
