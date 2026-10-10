-- À appliquer une seule fois avant d'activer les mutations Sales Express.
ALTER TABLE sales
  ADD COLUMN idempotency_key VARCHAR(120) NULL AFTER notes,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER idempotency_key,
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER created_by,
  ADD UNIQUE KEY uk_sales_idempotency (idempotency_key),
  ADD INDEX idx_sales_created_by (created_by),
  ADD CONSTRAINT fk_sales_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
