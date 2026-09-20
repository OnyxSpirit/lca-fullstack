-- Finalisation additive du magasin PR. La source d'autorité des quantités reste part_stocks.
ALTER TABLE parts ADD COLUMN oem_reference VARCHAR(120) NULL AFTER reference, ADD INDEX idx_parts_oem_reference (oem_reference);
ALTER TABLE part_categories ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER description;
ALTER TABLE suppliers ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
ALTER TABLE purchase_order_items ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER line_total, ADD INDEX idx_poi_order_part (purchase_order_id, part_id);

CREATE TABLE purchase_order_receipts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, purchase_order_id BIGINT UNSIGNED NOT NULL,
 receipt_number VARCHAR(80) NOT NULL, idempotency_key VARCHAR(120) NOT NULL,
 agency_id BIGINT UNSIGNED NOT NULL, location_id BIGINT UNSIGNED NULL, received_by BIGINT UNSIGNED NULL,
 notes TEXT NULL, received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_purchase_receipt_idempotency (purchase_order_id,idempotency_key), UNIQUE KEY uk_purchase_receipt_number (receipt_number),
 INDEX idx_purchase_receipt_date (purchase_order_id,received_at),
 FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT,
 FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
 FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE RESTRICT,
 FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE purchase_order_receipt_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, receipt_id BIGINT UNSIGNED NOT NULL,
 purchase_order_item_id BIGINT UNSIGNED NOT NULL, part_id BIGINT UNSIGNED NOT NULL, quantity DECIMAL(12,2) NOT NULL,
 UNIQUE KEY uk_receipt_item(receipt_id,purchase_order_item_id),
 FOREIGN KEY(receipt_id) REFERENCES purchase_order_receipts(id) ON DELETE CASCADE,
 FOREIGN KEY(purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
 FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE RESTRICT,
 CONSTRAINT chk_receipt_item_quantity CHECK(quantity>0)
) ENGINE=InnoDB;
ALTER TABLE part_movements
 ADD COLUMN stock_before DECIMAL(12,2) NULL AFTER quantity,
 ADD COLUMN stock_after DECIMAL(12,2) NULL AFTER stock_before,
 ADD COLUMN correlation_key VARCHAR(120) NULL AFTER reference_id,
 ADD INDEX idx_part_movement_correlation(correlation_key);
