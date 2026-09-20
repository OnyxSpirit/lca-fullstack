ALTER TABLE customers
  ADD COLUMN customer_code VARCHAR(50) NULL AFTER id,
  ADD COLUMN agency_id BIGINT UNSIGNED NULL AFTER customer_type,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER assigned_user_id,
  ADD COLUMN civility ENUM('M.','Mme','Société') NULL AFTER customer_type,
  ADD COLUMN postal_code VARCHAR(30) NULL AFTER address,
  ADD COLUMN classification ENUM('occasional','regular','vip','at_risk') NOT NULL DEFAULT 'occasional' AFTER score,
  ADD COLUMN notes TEXT NULL AFTER classification;

UPDATE customers c LEFT JOIN users u ON u.id=c.assigned_user_id
SET c.agency_id=COALESCE(u.agency_id,(SELECT MIN(id) FROM agencies)),
    c.created_by=COALESCE(c.assigned_user_id,c.created_by),
    c.customer_code=CONCAT('CLI-',LPAD(c.id,6,'0'))
WHERE c.agency_id IS NULL OR c.customer_code IS NULL;

ALTER TABLE customers
  MODIFY customer_code VARCHAR(50) NOT NULL,
  MODIFY agency_id BIGINT UNSIGNED NOT NULL,
  ADD UNIQUE KEY uk_customer_code (customer_code),
  ADD INDEX idx_customer_agency (agency_id),
  ADD INDEX idx_customer_assigned (assigned_user_id),
  ADD INDEX idx_customer_classification (classification),
  ADD CONSTRAINT fk_customer_agency FOREIGN KEY (agency_id) REFERENCES agencies(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_customer_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
