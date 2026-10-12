CREATE TABLE budget_fund_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    budget_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM('additional_allocation') NOT NULL DEFAULT 'additional_allocation',
    amount DECIMAL(18,2) NOT NULL,
    reason VARCHAR(500) NULL,
    reference VARCHAR(100) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_budget_fund_movement_budget_date (budget_id,created_at,id),
    CONSTRAINT chk_budget_fund_movement_positive CHECK (amount > 0),
    CONSTRAINT fk_budget_fund_movement_budget FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_budget_fund_movement_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
