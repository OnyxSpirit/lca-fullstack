ALTER TABLE part_sale_returns
  ADD COLUMN justification_document_id BIGINT UNSIGNED NULL AFTER reason,
  ADD COLUMN warranty_applicable BOOLEAN NOT NULL DEFAULT FALSE AFTER justification_document_id,
  ADD COLUMN warranty_reference VARCHAR(150) NULL AFTER warranty_applicable,
  ADD COLUMN exchange_sale_id BIGINT UNSIGNED NULL AFTER warranty_reference,
  ADD COLUMN decision_reason VARCHAR(500) NULL AFTER financial_amount,
  ADD KEY idx_part_sale_return_exchange(exchange_sale_id),
  ADD CONSTRAINT fk_part_sale_return_document FOREIGN KEY(justification_document_id) REFERENCES documents(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_part_sale_return_exchange FOREIGN KEY(exchange_sale_id) REFERENCES part_sales(id) ON DELETE RESTRICT;

CREATE TABLE part_sale_return_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  part_sale_return_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('RECEIVED','DECIDED') NOT NULL,
  decision VARCHAR(40) NULL,
  financial_decision VARCHAR(40) NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  reason VARCHAR(500) NOT NULL,
  performed_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_part_sale_return_history(part_sale_return_id,created_at),
  CONSTRAINT fk_part_sale_return_history_return FOREIGN KEY(part_sale_return_id) REFERENCES part_sale_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_part_sale_return_history_user FOREIGN KEY(performed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO part_sale_return_history(part_sale_return_id,event_type,decision,financial_decision,amount,reason,performed_by,created_at)
SELECT id,'RECEIVED',decision,financial_decision,financial_amount,reason,created_by,created_at FROM part_sale_returns;
