ALTER TABLE vehicles
  ADD COLUMN vehicle_type ENUM('new','used','demo','courtesy') NOT NULL DEFAULT 'new' AFTER supplier_id,
  ADD COLUMN body_type VARCHAR(60) NULL AFTER registration_number,
  ADD COLUMN first_registration_date DATE NULL AFTER year,
  ADD COLUMN interior_color VARCHAR(80) NULL AFTER color,
  ADD COLUMN fiscal_power SMALLINT UNSIGNED NULL AFTER transmission,
  ADD COLUMN real_power SMALLINT UNSIGNED NULL AFTER fiscal_power,
  ADD COLUMN co2_emissions SMALLINT UNSIGNED NULL AFTER real_power,
  ADD COLUMN refurbishment_cost DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER purchase_price,
  ADD COLUMN transport_cost DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER refurbishment_cost,
  ADD COLUMN administrative_cost DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER transport_cost,
  ADD COLUMN minimum_price DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER sale_price,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER notes,
  ADD COLUMN archived_at DATETIME NULL AFTER updated_at,
  ADD INDEX idx_vehicle_type (vehicle_type),
  ADD INDEX idx_vehicle_location (location_id),
  ADD INDEX idx_vehicle_entry (entry_date),
  ADD INDEX idx_vehicle_registration (registration_number),
  ADD CONSTRAINT fk_vehicle_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE vehicle_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500) NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_image_order (vehicle_id, sort_order),
  CONSTRAINT fk_vehicle_image_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_vehicle_image_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_features (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE vehicle_feature_assignments (
  vehicle_id BIGINT UNSIGNED NOT NULL,
  feature_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (vehicle_id, feature_id),
  CONSTRAINT fk_vfa_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_vfa_feature FOREIGN KEY (feature_id) REFERENCES vehicle_features(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE vehicle_price_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  old_sale_price DECIMAL(18,2) NULL,
  new_sale_price DECIMAL(18,2) NOT NULL,
  old_minimum_price DECIMAL(18,2) NULL,
  new_minimum_price DECIMAL(18,2) NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  reason VARCHAR(255) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_price_history (vehicle_id, changed_at),
  CONSTRAINT fk_vph_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_vph_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

