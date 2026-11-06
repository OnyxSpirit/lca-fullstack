ALTER TABLE concessions
  ADD COLUMN legal_form VARCHAR(120) NULL AFTER legal_name;

ALTER TABLE customers
  MODIFY COLUMN customer_type ENUM('individual','company','administration','institution') NOT NULL DEFAULT 'individual';

ALTER TABLE leads
  MODIFY COLUMN lead_type ENUM('individual','company','administration','institution') NULL;

CREATE TABLE commercial_models (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version_id BIGINT UNSIGNED NOT NULL,
  vehicle_type VARCHAR(100) NULL,
  configuration VARCHAR(190) NULL,
  engine_power VARCHAR(100) NULL,
  combined_power_kw DECIMAL(10,2) NULL,
  maximum_torque_nm DECIMAL(10,2) NULL,
  power_ch DECIMAL(10,2) NULL,
  acceleration_0_100_seconds DECIMAL(8,2) NULL,
  electric_range_km DECIMAL(10,2) NULL,
  combined_range_km DECIMAL(10,2) NULL,
  seat_count SMALLINT UNSIGNED NULL,
  drive_method VARCHAR(120) NULL,
  length_mm INT UNSIGNED NULL,
  width_mm INT UNSIGNED NULL,
  height_mm INT UNSIGNED NULL,
  advanced_sensors TEXT NULL,
  battery_cooling_function TEXT NULL,
  rear_suspension VARCHAR(190) NULL,
  ventilated_front_discs BOOLEAN NULL,
  ventilated_rear_discs BOOLEAN NULL,
  central_screen_dashboard TEXT NULL,
  remote_app_control BOOLEAN NULL,
  steering_system VARCHAR(190) NULL,
  warranty_text VARCHAR(500) NULL,
  availability_text VARCHAR(255) NULL,
  delivery_lead_time VARCHAR(255) NULL,
  catalog_price DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'XAF',
  additional_specs JSON NULL,
  is_commercially_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_commercial_model_version (version_id),
  INDEX idx_commercial_model_available (is_commercially_available,version_id),
  CONSTRAINT fk_commercial_model_version FOREIGN KEY(version_id) REFERENCES versions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_model_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE commercial_model_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commercial_model_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500) NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_commercial_model_image_order (commercial_model_id,is_primary,sort_order,id),
  CONSTRAINT fk_commercial_model_image_model FOREIGN KEY(commercial_model_id) REFERENCES commercial_models(id) ON DELETE CASCADE,
  CONSTRAINT fk_commercial_model_image_user FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE quotations
  ADD COLUMN client_request_id CHAR(36) NULL AFTER notes,
  ADD UNIQUE KEY uq_quotation_request (created_by,client_request_id);

ALTER TABLE quotation_items
  ADD COLUMN commercial_model_id BIGINT UNSIGNED NULL AFTER vehicle_id,
  ADD COLUMN availability_snapshot VARCHAR(255) NULL AFTER line_total,
  ADD COLUMN technical_specs_snapshot JSON NULL AFTER availability_snapshot,
  ADD COLUMN selected_images_snapshot JSON NULL AFTER technical_specs_snapshot,
  ADD CONSTRAINT fk_quote_item_commercial_model FOREIGN KEY(commercial_model_id) REFERENCES commercial_models(id) ON DELETE SET NULL;

CREATE TABLE proformas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proforma_number VARCHAR(50) NULL UNIQUE,
  source_quotation_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  opportunity_id BIGINT UNSIGNED NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  responsible_user_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  status ENUM('draft','issued') NOT NULL DEFAULT 'draft',
  valid_until DATE NULL,
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  discount_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  total DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_mode ENUM('TAXABLE','TAX_EXEMPT') NOT NULL DEFAULT 'TAXABLE',
  price_input_mode ENUM('HT','TTC') NOT NULL DEFAULT 'HT',
  tax_rate_snapshot DECIMAL(8,4) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'XAF',
  payment_terms TEXT NULL,
  warranty_terms TEXT NULL,
  availability_terms TEXT NULL,
  delivery_terms TEXT NULL,
  notes TEXT NULL,
  document_identity_snapshot JSON NULL,
  customer_snapshot JSON NULL,
  client_request_id CHAR(36) NULL,
  issued_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proforma_source_quotation (source_quotation_id),
  UNIQUE KEY uq_proforma_request (created_by,client_request_id),
  INDEX idx_proforma_customer_date (customer_id,created_at),
  INDEX idx_proforma_agency_status (agency_id,status,created_at),
  CONSTRAINT fk_proforma_source_quotation FOREIGN KEY(source_quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_proforma_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_proforma_opportunity FOREIGN KEY(opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_proforma_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_proforma_responsible FOREIGN KEY(responsible_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_proforma_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE proforma_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proforma_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NULL,
  commercial_model_id BIGINT UNSIGNED NULL,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
  discount DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  availability_snapshot VARCHAR(255) NULL,
  technical_specs_snapshot JSON NULL,
  selected_images_snapshot JSON NULL,
  INDEX idx_proforma_item_proforma (proforma_id,id),
  CONSTRAINT fk_proforma_item_proforma FOREIGN KEY(proforma_id) REFERENCES proformas(id) ON DELETE CASCADE,
  CONSTRAINT fk_proforma_item_vehicle FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_proforma_item_model FOREIGN KEY(commercial_model_id) REFERENCES commercial_models(id) ON DELETE SET NULL,
  CONSTRAINT chk_proforma_item_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('vehicles','view','vehicles.catalog.view','Consulter le catalogue commercial','Consulter le catalogue commercial','Véhicules','Consulter les modèles commercialisables et leurs fiches techniques',TRUE),
('vehicles','manage','vehicles.catalog.manage','Gérer le catalogue commercial','Gérer le catalogue commercial','Véhicules','Gérer les modèles, caractéristiques et photographies du catalogue',TRUE),
('proformas','view','proformas.view','Consulter les pro formas','Consulter les pro formas','Documents commerciaux','Consulter les factures pro forma accessibles',TRUE),
('proformas','create','proformas.create','Créer les pro formas','Créer les pro formas','Documents commerciaux','Créer une facture pro forma en brouillon',TRUE),
('proformas','update','proformas.update','Modifier les pro formas','Modifier les pro formas','Documents commerciaux','Modifier une facture pro forma en brouillon',TRUE),
('proformas','validate','proformas.issue','Émettre les pro formas','Émettre les pro formas','Documents commerciaux','Finaliser, numéroter et archiver une facture pro forma',TRUE),
('proformas','export','proformas.export','Exporter les pro formas','Exporter les pro formas','Documents commerciaux','Télécharger la représentation PDF d’une facture pro forma',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN(
  'vehicles.catalog.view','vehicles.catalog.manage','proformas.view','proformas.create','proformas.update','proformas.issue','proformas.export'
) WHERE r.code='SUPER_ADMIN'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
