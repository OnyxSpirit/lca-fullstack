ALTER TABLE vehicles
  DROP FOREIGN KEY fk_vehicle_version;

ALTER TABLE vehicles
  MODIFY COLUMN version_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN vin VARCHAR(50) NULL,
  ADD COLUMN commercial_origin ENUM('CONCESSION','EXTERNAL','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' AFTER supplier_id,
  ADD COLUMN commercial_origin_source ENUM('LEGACY','SALE','MANUAL','WORKSHOP','IMPORT') NOT NULL DEFAULT 'LEGACY' AFTER commercial_origin,
  ADD COLUMN is_commercial_stock BOOLEAN NOT NULL DEFAULT TRUE AFTER commercial_origin_source,
  ADD COLUMN identity_brand VARCHAR(120) NULL AFTER is_commercial_stock,
  ADD COLUMN identity_model VARCHAR(120) NULL AFTER identity_brand,
  ADD COLUMN identity_version VARCHAR(150) NULL AFTER identity_model,
  ADD INDEX idx_vehicle_commercial_stock (is_commercial_stock,archived_at,status,agency_id),
  ADD INDEX idx_vehicle_commercial_origin (commercial_origin,agency_id),
  ADD CONSTRAINT chk_vehicle_identity_description CHECK (
    version_id IS NOT NULL OR
    (NULLIF(TRIM(identity_brand),'') IS NOT NULL AND NULLIF(TRIM(identity_model),'') IS NOT NULL)
  ),
  ADD CONSTRAINT fk_vehicle_version_optional FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE customer_vehicles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  relation_type ENUM('OWNER','DRIVER','RESPONSIBLE','FLEET') NOT NULL,
  source_type ENUM('SALE','REPAIR_ORDER','MANUAL','IMPORT') NOT NULL,
  source_id BIGINT UNSIGNED NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_to DATETIME NULL,
  notes VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  current_relation_key TINYINT GENERATED ALWAYS AS (CASE WHEN is_current THEN 1 ELSE NULL END) STORED,
  UNIQUE KEY uq_customer_vehicle_current (customer_id,vehicle_id,relation_type,current_relation_key),
  KEY idx_customer_vehicle_customer (customer_id,is_current,vehicle_id),
  KEY idx_customer_vehicle_vehicle (vehicle_id,is_current,customer_id),
  KEY idx_customer_vehicle_agency (agency_id,is_current),
  KEY idx_customer_vehicle_source (source_type,source_id),
  CONSTRAINT chk_customer_vehicle_period CHECK (
    (is_current=TRUE AND valid_to IS NULL) OR
    (is_current=FALSE AND valid_to IS NOT NULL AND valid_to>=valid_from)
  ),
  CONSTRAINT fk_customer_vehicle_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_vehicle_vehicle FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_vehicle_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_customer_vehicle_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE repair_orders
  ADD COLUMN vehicle_commercial_origin ENUM('CONCESSION','EXTERNAL','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' AFTER vehicle_id,
  ADD COLUMN vehicle_origin_source ENUM('LEGACY','SALE','MANUAL','WORKSHOP','IMPORT') NOT NULL DEFAULT 'LEGACY' AFTER vehicle_commercial_origin,
  ADD INDEX idx_ro_vehicle_origin (agency_id,vehicle_commercial_origin,created_at);
