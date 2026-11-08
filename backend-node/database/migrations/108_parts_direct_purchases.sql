CREATE TABLE part_direct_purchases (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 purchase_number VARCHAR(80) NOT NULL,
 agency_id BIGINT UNSIGNED NOT NULL,
 supplier_id BIGINT UNSIGNED NULL,
 seller_name VARCHAR(200) NOT NULL,
 seller_contact VARCHAR(200) NULL,
 purchase_kind ENUM('DIRECT','URGENT','OCCASIONAL') NOT NULL,
 funding_source ENUM('SUPPLIER_CREDIT','AGENT_ADVANCE','CENTRAL_DISBURSEMENT') NOT NULL,
 agent_id BIGINT UNSIGNED NULL,
 status ENUM('OPEN','PARTIALLY_RECEIVED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'OPEN',
 currency_code CHAR(3) NOT NULL,
 total DECIMAL(18,2) NOT NULL,
 notes TEXT NULL,
 proof_document_id BIGINT UNSIGNED NULL,
 idempotency_key VARCHAR(64) NOT NULL,
 created_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_part_direct_purchase_number(purchase_number),
 UNIQUE KEY uq_part_direct_purchase_request(created_by,idempotency_key),
 KEY idx_part_direct_purchase_agency(agency_id,status,created_at),
 CHECK(total>=0),
 CHECK((funding_source='AGENT_ADVANCE' AND agent_id IS NOT NULL) OR funding_source<>'AGENT_ADVANCE'),
 FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
 FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
 FOREIGN KEY(agent_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE part_direct_purchase_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 direct_purchase_id BIGINT UNSIGNED NOT NULL,
 part_id BIGINT UNSIGNED NOT NULL,
 request_item_id BIGINT UNSIGNED NULL,
 quantity_ordered DECIMAL(12,2) NOT NULL,
 quantity_received DECIMAL(12,2) NOT NULL DEFAULT 0,
 unit_cost DECIMAL(18,2) NOT NULL,
 tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
 line_total DECIMAL(18,2) NOT NULL,
 CHECK(quantity_ordered>0 AND quantity_received>=0 AND quantity_received<=quantity_ordered),
 CHECK(unit_cost>=0 AND tax_rate>=0 AND line_total>=0),
 FOREIGN KEY(direct_purchase_id) REFERENCES part_direct_purchases(id) ON DELETE CASCADE,
 FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE RESTRICT,
 FOREIGN KEY(request_item_id) REFERENCES sav_part_request_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE part_direct_purchase_receipts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 receipt_number VARCHAR(80) NOT NULL,
 direct_purchase_id BIGINT UNSIGNED NOT NULL,
 part_stock_id BIGINT UNSIGNED NOT NULL,
 purchase_item_id BIGINT UNSIGNED NOT NULL,
 quantity DECIMAL(12,2) NOT NULL,
 idempotency_key VARCHAR(64) NOT NULL,
 received_by BIGINT UNSIGNED NOT NULL,
 received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_part_direct_receipt_number(receipt_number),
 UNIQUE KEY uq_part_direct_receipt_request(direct_purchase_id,idempotency_key,purchase_item_id),
 CHECK(quantity>0),
 FOREIGN KEY(direct_purchase_id) REFERENCES part_direct_purchases(id) ON DELETE RESTRICT,
 FOREIGN KEY(part_stock_id) REFERENCES part_stocks(id) ON DELETE RESTRICT,
 FOREIGN KEY(purchase_item_id) REFERENCES part_direct_purchase_items(id) ON DELETE RESTRICT,
 FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE part_direct_purchase_settlements (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 direct_purchase_id BIGINT UNSIGNED NOT NULL,
 settlement_kind ENUM('SUPPLIER_PAYMENT','AGENT_REIMBURSEMENT') NOT NULL,
 amount DECIMAL(18,2) NOT NULL,
 treasury_movement_id BIGINT UNSIGNED NOT NULL,
 recorded_by BIGINT UNSIGNED NOT NULL,
 recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_part_direct_settlement_movement(treasury_movement_id),
 CHECK(amount>0),
 FOREIGN KEY(direct_purchase_id) REFERENCES part_direct_purchases(id) ON DELETE RESTRICT,
 FOREIGN KEY(treasury_movement_id) REFERENCES treasury_movements(id) ON DELETE RESTRICT,
 FOREIGN KEY(recorded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('parts','view','parts.direct_purchase.view','Voir les achats directs de pièces','Pièces & stock','Consulter les achats directs, urgents et occasionnels',TRUE),
('parts','create','parts.direct_purchase.create','Créer un achat direct de pièces','Pièces & stock','Créer un achat sans imposer une fiche fournisseur',TRUE),
('parts','update','parts.direct_purchase.receive','Réceptionner un achat direct','Pièces & stock','Réceptionner partiellement ou totalement les pièces',TRUE),
('parts','update','parts.direct_purchase.settle','Rapprocher un règlement d’achat direct','Pièces & stock','Rattacher un mouvement réel de trésorerie à une dette ou avance',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN('parts.direct_purchase.view','parts.direct_purchase.create','parts.direct_purchase.receive','parts.direct_purchase.settle') WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
