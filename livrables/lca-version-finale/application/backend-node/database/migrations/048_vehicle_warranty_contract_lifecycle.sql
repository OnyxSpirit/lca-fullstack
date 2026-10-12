CREATE TABLE vehicle_warranty_contracts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  provider_id BIGINT UNSIGNED NULL,
  decision ENUM('UNDETERMINED','APPLICABLE','NOT_APPLICABLE') NOT NULL DEFAULT 'UNDETERMINED',
  status ENUM('PENDING_DECISION','NOT_APPLICABLE','PENDING_ACTIVATION','ACTIVE') NOT NULL DEFAULT 'PENDING_DECISION',
  provider_code_snapshot VARCHAR(50) NULL,
  provider_name_snapshot VARCHAR(200) NULL,
  duration_months SMALLINT UNSIGNED NULL,
  mileage_limit INT UNSIGNED NULL,
  decision_at DATETIME NULL,
  decided_by BIGINT UNSIGNED NULL,
  start_date DATETIME NULL,
  expiry_date DATETIME NULL,
  initial_mileage INT UNSIGNED NULL,
  activated_at DATETIME NULL,
  activated_by BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_vwc_sale(sale_id),
  INDEX idx_vwc_vehicle(vehicle_id),
  INDEX idx_vwc_provider_status(provider_id,status),
  INDEX idx_vwc_customer(customer_id),
  CONSTRAINT chk_vwc_duration CHECK(duration_months IS NULL OR duration_months BETWEEN 1 AND 240),
  CONSTRAINT chk_vwc_mileage CHECK(mileage_limit IS NULL OR mileage_limit>0),
  CONSTRAINT chk_vwc_decision_data CHECK((decision='APPLICABLE' AND provider_id IS NOT NULL AND provider_code_snapshot IS NOT NULL AND provider_name_snapshot IS NOT NULL AND duration_months IS NOT NULL) OR (decision<>'APPLICABLE' AND provider_id IS NULL AND provider_code_snapshot IS NULL AND provider_name_snapshot IS NULL AND duration_months IS NULL AND mileage_limit IS NULL)),
  CONSTRAINT fk_vwc_sale FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vwc_vehicle FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vwc_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vwc_provider FOREIGN KEY(provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vwc_decided_by FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_vwc_activated_by FOREIGN KEY(activated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_vwc_created_by FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_vwc_updated_by FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO vehicle_warranty_contracts(sale_id,vehicle_id,customer_id,created_by)
SELECT s.id,MIN(si.vehicle_id),s.customer_id,s.created_by
FROM sales s JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL
LEFT JOIN vehicle_warranty_contracts vwc ON vwc.sale_id=s.id
WHERE vwc.id IS NULL
GROUP BY s.id,s.customer_id,s.created_by;
