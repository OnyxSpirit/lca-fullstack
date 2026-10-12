ALTER TABLE warranty_claim_payments
  ADD COLUMN payment_method_id BIGINT UNSIGNED NULL AFTER claim_id,
  ADD CONSTRAINT fk_wcp_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT;

CREATE TABLE treasury_flow_configurations (
  concession_id BIGINT UNSIGNED PRIMARY KEY,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at DATETIME NULL,
  activated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_treasury_flow_config_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_flow_config_activator FOREIGN KEY (activated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE treasury_account_mappings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concession_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  payment_method_id BIGINT UNSIGNED NOT NULL,
  treasury_account_id BIGINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_mapping_context (agency_id,payment_method_id),
  KEY idx_treasury_mapping_scope (concession_id,agency_id,is_active),
  CONSTRAINT fk_treasury_mapping_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_account FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
