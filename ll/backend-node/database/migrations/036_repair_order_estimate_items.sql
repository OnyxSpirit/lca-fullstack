-- Chiffrage pré-validation distinct des consommations et lignes facturables réelles.
CREATE TABLE repair_order_estimate_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NULL,
    item_type ENUM('part','labor') NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL,
    request_key VARCHAR(64) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_repair_estimate_request (repair_order_id,request_key),
    INDEX idx_repair_estimate_order (repair_order_id),
    CONSTRAINT fk_repair_estimate_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_repair_estimate_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_repair_estimate_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
