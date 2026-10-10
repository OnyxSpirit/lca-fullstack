CREATE TABLE delivery_service_catalog (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concession_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description VARCHAR(1000) NULL,
  default_unit_price DECIMAL(18,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_service_catalog_code (concession_id,code),
  KEY idx_delivery_service_catalog_active (concession_id,is_active,display_order,id),
  CONSTRAINT chk_delivery_service_catalog_price CHECK (default_unit_price > 0),
  CONSTRAINT fk_delivery_service_catalog_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_catalog_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE delivery_services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL,
  sale_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  concession_id BIGINT UNSIGNED NOT NULL,
  catalog_service_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  invoice_item_id BIGINT UNSIGNED NULL,
  code_snapshot VARCHAR(80) NOT NULL,
  name_snapshot VARCHAR(180) NOT NULL,
  description_snapshot VARCHAR(1000) NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price_snapshot DECIMAL(18,2) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  client_request_id CHAR(36) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_service_request (created_by,client_request_id),
  UNIQUE KEY uq_delivery_service_catalog_once (delivery_id,catalog_service_id),
  UNIQUE KEY uq_delivery_service_invoice (invoice_id),
  UNIQUE KEY uq_delivery_service_invoice_item (invoice_item_id),
  KEY idx_delivery_service_delivery (delivery_id,id),
  KEY idx_delivery_service_sale (sale_id,id),
  CONSTRAINT chk_delivery_service_quantity CHECK (quantity > 0),
  CONSTRAINT chk_delivery_service_price CHECK (unit_price_snapshot > 0 AND amount > 0),
  CONSTRAINT fk_delivery_service_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_catalog FOREIGN KEY (catalog_service_id) REFERENCES delivery_service_catalog(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_invoice_item FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE invoice_items
  ADD COLUMN source_type VARCHAR(64) NULL,
  ADD COLUMN source_id BIGINT UNSIGNED NULL,
  ADD UNIQUE KEY uq_invoice_item_source (source_type,source_id),
  ADD KEY idx_invoice_item_source (source_type,source_id);

INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('delivery','read','delivery.service.view','Voir les services de livraison','Livraisons','Consulter le catalogue et les prestations de livraison',TRUE),
('delivery','manage','delivery.service.manage','Gérer les services de livraison','Livraisons','Créer, modifier et désactiver le catalogue concession',TRUE),
('delivery','create','delivery.service.add','Ajouter un service facturable','Livraisons','Ajouter et facturer une prestation sur une livraison',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=VALUES(is_active);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN('delivery.service.view','delivery.service.manage','delivery.service.add')
WHERE r.code='SUPER_ADMIN'
ON DUPLICATE KEY UPDATE scope='GLOBAL';
