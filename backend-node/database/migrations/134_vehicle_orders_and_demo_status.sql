CREATE TABLE vehicle_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NULL UNIQUE,
  commercial_model_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  quantity_ordered INT UNSIGNED NOT NULL,
  client_request_id CHAR(36) NOT NULL,
  ordered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_order_request (created_by,client_request_id),
  KEY idx_vehicle_order_agency_date (agency_id,ordered_at,id),
  CONSTRAINT chk_vehicle_order_quantity CHECK (quantity_ordered > 0),
  CONSTRAINT fk_vehicle_order_model FOREIGN KEY (commercial_model_id) REFERENCES commercial_models(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_order_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_order_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE vehicles
  ADD COLUMN vehicle_order_id BIGINT UNSIGNED NULL AFTER supplier_id,
  ADD KEY idx_vehicle_order_status (vehicle_order_id,status,id),
  ADD CONSTRAINT fk_vehicle_order_origin FOREIGN KEY (vehicle_order_id) REFERENCES vehicle_orders(id) ON DELETE RESTRICT;

CREATE TABLE vehicle_order_receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_order_id BIGINT UNSIGNED NOT NULL,
  quantity_received INT UNSIGNED NOT NULL,
  vehicle_ids JSON NOT NULL,
  client_request_id CHAR(36) NOT NULL,
  received_by BIGINT UNSIGNED NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_order_receipt_request (received_by,client_request_id),
  KEY idx_vehicle_order_receipt_order (vehicle_order_id,received_at,id),
  CONSTRAINT chk_vehicle_order_receipt_quantity CHECK (quantity_received > 0),
  CONSTRAINT fk_vehicle_order_receipt_order FOREIGN KEY (vehicle_order_id) REFERENCES vehicle_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_order_receipt_user FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE vehicles
  MODIFY COLUMN status ENUM('ordered','in_transit','received','preparation','available','demo','reserved','sold','delivered') NOT NULL DEFAULT 'ordered';
