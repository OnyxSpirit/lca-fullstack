-- Données métier manquantes pour finaliser le cycle SAV/OR.
ALTER TABLE vehicle_reception_inspections
  ADD COLUMN mileage INT UNSIGNED NULL AFTER items_in_vehicle,
  ADD COLUMN observations TEXT NULL AFTER mileage;

ALTER TABLE repair_order_items
  ADD COLUMN part_stock_id BIGINT UNSIGNED NULL AFTER part_id,
  ADD COLUMN status ENUM('active','cancelled') NOT NULL DEFAULT 'active' AFTER line_total,
  ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN cancelled_at DATETIME NULL AFTER cancelled_by,
  ADD INDEX idx_roi_stock (part_stock_id),
  ADD CONSTRAINT fk_roi_stock FOREIGN KEY (part_stock_id) REFERENCES part_stocks(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_roi_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE repair_quality_controls (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id BIGINT UNSIGNED NOT NULL,
  planned_work_completed BOOLEAN NOT NULL DEFAULT FALSE,
  defect_corrected BOOLEAN NOT NULL DEFAULT FALSE,
  road_test_performed BOOLEAN NOT NULL DEFAULT FALSE,
  no_leaks BOOLEAN NOT NULL DEFAULT FALSE,
  levels_checked BOOLEAN NOT NULL DEFAULT FALSE,
  cleanliness_checked BOOLEAN NOT NULL DEFAULT FALSE,
  result ENUM('passed','failed') NOT NULL,
  reason VARCHAR(500) NULL,
  observations TEXT NULL,
  controlled_by BIGINT UNSIGNED NULL,
  controlled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_repair_qc_order_date (repair_order_id,controlled_at),
  CONSTRAINT fk_repair_qc_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_repair_qc_user FOREIGN KEY (controlled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_order_handovers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  customer_name VARCHAR(200) NOT NULL,
  mileage_out INT UNSIGNED NULL,
  observations TEXT NULL,
  signature_data LONGTEXT NULL,
  handed_over_by BIGINT UNSIGNED NULL,
  handed_over_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_repair_handover_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_repair_handover_user FOREIGN KEY (handed_over_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
