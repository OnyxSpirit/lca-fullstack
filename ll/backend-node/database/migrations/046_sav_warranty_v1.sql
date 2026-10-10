CREATE TABLE warranty_providers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  tax_identifier VARCHAR(100) NULL,
  contact_name VARCHAR(150) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE repair_order_warranties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  provider_id BIGINT UNSIGNED NULL,
  coverage_mode ENUM('FULL','PARTIAL') NULL,
  decision_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  allocation_status ENUM('UNALLOCATED','DRAFT','CONFIRMED','LEGACY_UNALLOCATED') NOT NULL DEFAULT 'UNALLOCATED',
  warranty_reference VARCHAR(100) NULL,
  authorization_reference VARCHAR(100) NULL,
  decision_comment TEXT NULL,
  decision_at DATETIME NULL,
  decided_by BIGINT UNSIGNED NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  legacy_source BOOLEAN NOT NULL DEFAULT FALSE,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_row_provider_status(provider_id,decision_status),
  INDEX idx_row_decision_allocation(decision_status,allocation_status),
  CONSTRAINT fk_row_order FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_row_provider FOREIGN KEY(provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_row_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_row_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_row_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_order_warranty_allocations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  warranty_id BIGINT UNSIGNED NOT NULL,
  repair_order_item_id BIGINT UNSIGNED NOT NULL UNIQUE,
  manufacturer_share_ht DECIMAL(18,2) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK(manufacturer_share_ht>=0),
  INDEX idx_rowa_warranty(warranty_id),
  CONSTRAINT fk_rowa_warranty FOREIGN KEY(warranty_id) REFERENCES repair_order_warranties(id) ON DELETE CASCADE,
  CONSTRAINT fk_rowa_item FOREIGN KEY(repair_order_item_id) REFERENCES repair_order_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rowa_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_rowa_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE warranty_claims (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  claim_number VARCHAR(50) NOT NULL UNIQUE,
  warranty_id BIGINT UNSIGNED NOT NULL UNIQUE,
  provider_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  status ENUM('issued','partially_paid','paid','cancelled') NOT NULL DEFAULT 'issued',
  subtotal DECIMAL(18,2) NOT NULL,
  tax_total DECIMAL(18,2) NOT NULL,
  total DECIMAL(18,2) NOT NULL,
  amount_received DECIMAL(18,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(18,2) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'XAF',
  reference VARCHAR(100) NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_by BIGINT UNSIGNED NULL,
  cancelled_at DATETIME NULL,
  cancellation_reason VARCHAR(500) NULL,
  INDEX idx_wc_agency_status(agency_id,status,issued_at),
  INDEX idx_wc_provider_status(provider_id,status),
  CONSTRAINT fk_wc_warranty FOREIGN KEY(warranty_id) REFERENCES repair_order_warranties(id) ON DELETE RESTRICT,
  CONSTRAINT fk_wc_provider FOREIGN KEY(provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_wc_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_wc_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_wc_canceller FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE warranty_claim_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  claim_id BIGINT UNSIGNED NOT NULL,
  repair_order_item_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  quantity_snapshot DECIMAL(12,2) NOT NULL,
  real_line_total_ht DECIMAL(18,2) NOT NULL,
  tax_rate_snapshot DECIMAL(8,4) NOT NULL,
  manufacturer_share_ht DECIMAL(18,2) NOT NULL,
  manufacturer_tax DECIMAL(18,2) NOT NULL,
  manufacturer_total DECIMAL(18,2) NOT NULL,
  UNIQUE KEY uk_wci_claim_item(claim_id,repair_order_item_id),
  CONSTRAINT fk_wci_claim FOREIGN KEY(claim_id) REFERENCES warranty_claims(id) ON DELETE CASCADE,
  CONSTRAINT fk_wci_item FOREIGN KEY(repair_order_item_id) REFERENCES repair_order_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE warranty_claim_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  claim_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference VARCHAR(150) NULL,
  notes TEXT NULL,
  request_key VARCHAR(64) NOT NULL,
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  recorded_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_wcp_request(claim_id,request_key),
  INDEX idx_wcp_claim_date(claim_id,payment_date),
  CHECK(amount>0),
  CONSTRAINT fk_wcp_claim FOREIGN KEY(claim_id) REFERENCES warranty_claims(id) ON DELETE RESTRICT,
  CONSTRAINT fk_wcp_recorder FOREIGN KEY(recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE invoice_items ADD COLUMN repair_order_item_id BIGINT UNSIGNED NULL,
  ADD INDEX idx_invoice_item_repair_item(repair_order_item_id),
  ADD CONSTRAINT fk_invoice_item_repair_item FOREIGN KEY(repair_order_item_id) REFERENCES repair_order_items(id) ON DELETE RESTRICT;

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('service','update','service.warranty.manage','Gérer les garanties constructeur','SAV & Atelier','Créer et ventiler les dossiers de garantie',TRUE),
('service','approve','service.warranty.approve','Approuver les garanties constructeur','SAV & Atelier','Enregistrer la décision et confirmer la ventilation',TRUE);

INSERT INTO repair_order_warranties(repair_order_id,decision_status,allocation_status,warranty_reference,legacy_source,created_by)
SELECT id,'PENDING','LEGACY_UNALLOCATED',warranty_reference,TRUE,created_by
FROM repair_orders WHERE warranty_covered=TRUE
ON DUPLICATE KEY UPDATE repair_order_id=VALUES(repair_order_id);
