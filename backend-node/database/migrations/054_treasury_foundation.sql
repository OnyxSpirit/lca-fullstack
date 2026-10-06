CREATE TABLE treasury_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concession_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(1000) NULL,
  account_type ENUM('CASH','BANK','OTHER') NOT NULL,
  currency_code CHAR(3) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_account_code (concession_id,code),
  KEY idx_treasury_account_scope (concession_id,agency_id,is_active),
  CONSTRAINT fk_treasury_account_concession FOREIGN KEY (concession_id) REFERENCES concessions(id),
  CONSTRAINT fk_treasury_account_agency FOREIGN KEY (agency_id) REFERENCES agencies(id),
  CONSTRAINT fk_treasury_account_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE treasury_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concession_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(1000) NULL,
  allowed_direction ENUM('IN','OUT','BOTH') NOT NULL DEFAULT 'BOTH',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_category_code (concession_id,code),
  KEY idx_treasury_category_scope (concession_id,is_active),
  CONSTRAINT fk_treasury_category_concession FOREIGN KEY (concession_id) REFERENCES concessions(id),
  CONSTRAINT fk_treasury_category_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE treasury_transfers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_account_id BIGINT UNSIGNED NOT NULL,
  destination_account_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  value_date DATE NOT NULL,
  reference VARCHAR(150) NULL,
  description VARCHAR(1000) NOT NULL,
  reversal_of_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_transfer_reversal (reversal_of_id),
  KEY idx_treasury_transfer_date (value_date,id),
  CONSTRAINT chk_treasury_transfer_amount CHECK (amount > 0),
  CONSTRAINT chk_treasury_transfer_accounts CHECK (source_account_id <> destination_account_id),
  CONSTRAINT fk_treasury_transfer_source FOREIGN KEY (source_account_id) REFERENCES treasury_accounts(id),
  CONSTRAINT fk_treasury_transfer_destination FOREIGN KEY (destination_account_id) REFERENCES treasury_accounts(id),
  CONSTRAINT fk_treasury_transfer_reversal FOREIGN KEY (reversal_of_id) REFERENCES treasury_transfers(id),
  CONSTRAINT fk_treasury_transfer_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE treasury_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('IN','OUT') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  value_date DATE NOT NULL,
  description VARCHAR(1000) NOT NULL,
  payment_method_id BIGINT UNSIGNED NULL,
  reference VARCHAR(150) NULL,
  counterparty VARCHAR(255) NULL,
  source_type VARCHAR(64) NOT NULL,
  source_id VARCHAR(190) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  status ENUM('POSTED') NOT NULL DEFAULT 'POSTED',
  transfer_id BIGINT UNSIGNED NULL,
  reversal_of_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_source_event (source_type,source_id,event_type),
  UNIQUE KEY uq_treasury_movement_reversal (reversal_of_id),
  KEY idx_treasury_movement_account_date (account_id,value_date,id),
  KEY idx_treasury_movement_category (category_id,value_date),
  KEY idx_treasury_movement_status_date (status,value_date,id),
  KEY idx_treasury_movement_source (source_type,source_id),
  KEY idx_treasury_movement_transfer (transfer_id),
  CONSTRAINT chk_treasury_movement_amount CHECK (amount > 0),
  CONSTRAINT fk_treasury_movement_account FOREIGN KEY (account_id) REFERENCES treasury_accounts(id),
  CONSTRAINT fk_treasury_movement_category FOREIGN KEY (category_id) REFERENCES treasury_categories(id),
  CONSTRAINT fk_treasury_movement_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
  CONSTRAINT fk_treasury_movement_transfer FOREIGN KEY (transfer_id) REFERENCES treasury_transfers(id),
  CONSTRAINT fk_treasury_movement_reversal FOREIGN KEY (reversal_of_id) REFERENCES treasury_movements(id),
  CONSTRAINT fk_treasury_movement_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('treasury','view','treasury.view','Voir la trésorerie','Comptabilité & Trésorerie','Consulter comptes, soldes et journal',TRUE),
('treasury','manage','treasury.account.manage','Gérer les comptes de trésorerie','Comptabilité & Trésorerie','Créer et activer les comptes',TRUE),
('treasury','manage','treasury.category.manage','Gérer les catégories de trésorerie','Comptabilité & Trésorerie','Configurer les catégories concession',TRUE),
('treasury','create','treasury.transfer.create','Créer un transfert','Comptabilité & Trésorerie','Transférer entre comptes accessibles',TRUE),
('treasury','reverse','treasury.reverse','Contrepasser un mouvement','Comptabilité & Trésorerie','Créer une contre-écriture auditable',TRUE);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.code LIKE 'treasury.%'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
