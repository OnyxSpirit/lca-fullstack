CREATE TABLE treasury_manual_operations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concession_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NULL, account_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('IN','OUT') NOT NULL, amount DECIMAL(15,2) NOT NULL, currency_code CHAR(3) NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL, value_date DATE NOT NULL, description VARCHAR(1000) NOT NULL,
  payment_method_id BIGINT UNSIGNED NULL, reference VARCHAR(150) NULL, counterparty VARCHAR(255) NOT NULL,
  handed_to VARCHAR(255) NULL, client_request_id CHAR(36) NOT NULL, created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_manual_request (client_request_id),
  KEY idx_treasury_manual_scope_date (concession_id,agency_id,value_date,id), KEY idx_treasury_manual_account (account_id,value_date,id),
  CONSTRAINT chk_treasury_manual_amount CHECK (amount > 0), CONSTRAINT chk_treasury_manual_handed_to CHECK (direction='OUT' OR handed_to IS NULL),
  CONSTRAINT fk_treasury_manual_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_account FOREIGN KEY (account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_category FOREIGN KEY (category_id) REFERENCES treasury_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('treasury','create','treasury.receipt.create','Créer une entrée manuelle','Comptabilité & Trésorerie','Enregistrer une recette manuelle dans un compte autorisé',TRUE),
('treasury','create','treasury.disbursement.create','Créer une sortie manuelle','Comptabilité & Trésorerie','Enregistrer un décaissement manuel dans un compte autorisé',TRUE);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.code IN ('treasury.receipt.create','treasury.disbursement.create') AND p.is_active=TRUE
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
