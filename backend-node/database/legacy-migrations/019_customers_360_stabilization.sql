-- Compatibilité additive pour les installations créées avant le module Client 360°.
-- Cette migration ne supprime et ne modifie aucune donnée existante.

CREATE TABLE IF NOT EXISTS customer_contacts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role_title VARCHAR(120) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_contacts_customer (customer_id),
  CONSTRAINT fk_customer_contact_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

DELIMITER $$
CREATE PROCEDURE migrate_customers_360_stabilization()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='opportunities' AND COLUMN_NAME='customer_id'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN customer_id BIGINT UNSIGNED NULL AFTER lead_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='opportunities' AND INDEX_NAME='idx_opportunity_customer'
  ) THEN
    ALTER TABLE opportunities ADD INDEX idx_opportunity_customer (customer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='opportunities' AND CONSTRAINT_NAME='fk_opportunity_customer'
  ) THEN
    ALTER TABLE opportunities ADD CONSTRAINT fk_opportunity_customer
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activities' AND COLUMN_NAME='customer_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN customer_id BIGINT UNSIGNED NULL FIRST;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activities' AND INDEX_NAME='idx_activity_customer'
  ) THEN
    ALTER TABLE activities ADD INDEX idx_activity_customer (customer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='activities' AND CONSTRAINT_NAME='fk_activity_customer'
  ) THEN
    ALTER TABLE activities ADD CONSTRAINT fk_activity_customer
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$
CALL migrate_customers_360_stabilization()$$
DROP PROCEDURE migrate_customers_360_stabilization$$
DELIMITER ;
