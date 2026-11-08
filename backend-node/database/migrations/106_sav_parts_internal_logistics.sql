-- Chaîne logistique interne SAV -> Magasin. Les quantités physiques restent
-- exclusivement portées par part_stocks et part_movements.
CREATE TABLE sav_part_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_number VARCHAR(80) NOT NULL,
  repair_order_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  accepted_approval_id BIGINT UNSIGNED NOT NULL,
  status ENUM('OPEN','PARTIALLY_PREPARED','PREPARED','PARTIALLY_DELIVERED','DELIVERED','PARTIALLY_RECEIVED','RECEIVED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sav_part_request_number(request_number),
  UNIQUE KEY uq_sav_part_request_approval(accepted_approval_id),
  KEY idx_sav_part_request_queue(agency_id,status,created_at),
  CONSTRAINT fk_spr_order FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spr_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spr_approval FOREIGN KEY(accepted_approval_id) REFERENCES repair_approvals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spr_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE part_reservations
  ADD COLUMN dispatched_quantity DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER consumed_quantity,
  ADD CONSTRAINT chk_part_reservation_dispatch CHECK(dispatched_quantity>=0 AND dispatched_quantity<=quantity);

CREATE TABLE sav_part_request_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id BIGINT UNSIGNED NOT NULL,
  estimate_item_id BIGINT UNSIGNED NOT NULL,
  part_id BIGINT UNSIGNED NOT NULL,
  quantity_requested DECIMAL(12,2) NOT NULL,
  quantity_prepared DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity_delivered DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity_received DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity_consumed DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity_returned DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sav_part_request_estimate(request_id,estimate_item_id),
  KEY idx_sav_part_request_item_part(part_id),
  CONSTRAINT chk_spri_quantities CHECK(quantity_requested>0 AND quantity_prepared>=0 AND quantity_delivered>=0 AND quantity_received>=0 AND quantity_consumed>=0 AND quantity_returned>=0 AND quantity_prepared<=quantity_requested AND quantity_delivered<=quantity_prepared AND quantity_received<=quantity_delivered AND quantity_consumed+quantity_returned<=quantity_received),
  CONSTRAINT fk_spri_request FOREIGN KEY(request_id) REFERENCES sav_part_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_spri_estimate FOREIGN KEY(estimate_item_id) REFERENCES repair_order_estimate_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spri_part FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sav_part_delivery_notes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_number VARCHAR(80) NOT NULL,
  request_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  status ENUM('DISPATCHED','PARTIALLY_RECEIVED','RECEIVED','DISPUTED','CANCELLED') NOT NULL DEFAULT 'DISPATCHED',
  handed_over_by BIGINT UNSIGNED NOT NULL,
  handed_over_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  UNIQUE KEY uq_sav_delivery_number(delivery_number),
  UNIQUE KEY uq_sav_delivery_request_key(request_id,idempotency_key),
  KEY idx_sav_delivery_request(request_id,status),
  CONSTRAINT fk_spdn_request FOREIGN KEY(request_id) REFERENCES sav_part_requests(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spdn_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spdn_user FOREIGN KEY(handed_over_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sav_part_delivery_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  reservation_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  quantity_received DECIMAL(12,2) NOT NULL DEFAULT 0,
  discrepancy_reason VARCHAR(500) NULL,
  UNIQUE KEY uq_sav_delivery_item(delivery_id,request_item_id,reservation_id),
  CONSTRAINT chk_spdi_quantity CHECK(quantity>0 AND quantity_received>=0 AND quantity_received<=quantity),
  CONSTRAINT fk_spdi_delivery FOREIGN KEY(delivery_id) REFERENCES sav_part_delivery_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_spdi_request_item FOREIGN KEY(request_item_id) REFERENCES sav_part_request_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spdi_reservation FOREIGN KEY(reservation_id) REFERENCES part_reservations(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sav_part_delivery_receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  received_by BIGINT UNSIGNED NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  UNIQUE KEY uq_sav_receipt_delivery_key(delivery_id,idempotency_key),
  CONSTRAINT fk_spdr_delivery FOREIGN KEY(delivery_id) REFERENCES sav_part_delivery_notes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spdr_user FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sav_part_delivery_receipt_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_id BIGINT UNSIGNED NOT NULL,
  delivery_item_id BIGINT UNSIGNED NOT NULL,
  quantity_received DECIMAL(12,2) NOT NULL,
  discrepancy_reason VARCHAR(500) NULL,
  UNIQUE KEY uq_sav_receipt_item(receipt_id,delivery_item_id),
  CONSTRAINT chk_sav_receipt_item_quantity CHECK(quantity_received>=0),
  CONSTRAINT fk_spdri_receipt FOREIGN KEY(receipt_id) REFERENCES sav_part_delivery_receipts(id) ON DELETE CASCADE,
  CONSTRAINT fk_spdri_delivery_item FOREIGN KEY(delivery_item_id) REFERENCES sav_part_delivery_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sav_part_returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_number VARCHAR(80) NOT NULL,
  delivery_item_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  condition_code ENUM('GOOD','DAMAGED','DEFECTIVE','UNUSABLE') NOT NULL,
  status ENUM('DECLARED','HANDED_OVER','RECEIVED','RESTOCKED','QUARANTINED','SUPPLIER_RETURN','SCRAPPED','CANCELLED') NOT NULL DEFAULT 'DECLARED',
  reason VARCHAR(500) NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  declared_by BIGINT UNSIGNED NOT NULL,
  declared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_by BIGINT UNSIGNED NULL,
  received_at DATETIME NULL,
  decision_by BIGINT UNSIGNED NULL,
  decision_at DATETIME NULL,
  UNIQUE KEY uq_sav_return_number(return_number),
  UNIQUE KEY uq_sav_return_delivery_key(delivery_item_id,idempotency_key),
  CONSTRAINT chk_sav_return_quantity CHECK(quantity>0),
  CONSTRAINT fk_spr_delivery_item FOREIGN KEY(delivery_item_id) REFERENCES sav_part_delivery_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spr_declared_by FOREIGN KEY(declared_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spr_received_by FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_spr_decision_by FOREIGN KEY(decision_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('parts','view','parts.internal_request.view','Voir les demandes internes SAV','Pièces & stock','Consulter les demandes de pièces issues des OR',TRUE),
('parts','update','parts.internal_request.prepare','Préparer les demandes SAV','Pièces & stock','Réserver et préparer les pièces pour le SAV',TRUE),
('parts','update','parts.internal_delivery.dispatch','Remettre les pièces au SAV','Pièces & stock','Créer un bon de livraison interne et sortir les pièces du magasin',TRUE),
('service','update','service.parts.receive','Réceptionner les pièces au SAV','SAV & Atelier','Confirmer les quantités physiquement reçues du magasin',TRUE),
('service','update','service.parts.return','Retourner les pièces au magasin','SAV & Atelier','Déclarer et remettre les pièces non utilisées',TRUE),
('parts','update','parts.return.receive','Réceptionner un retour SAV','Pièces & stock','Contrôler et orienter un retour sans réintégration automatique',TRUE),
('service','update','service.order.handover_unpaid','Restituer avec un solde impayé','SAV & Atelier','Autoriser explicitement une restitution avec créance restante',TRUE),
('parts','update','parts.sale.release_unpaid','Remettre une vente pièces impayée','Pièces & stock','Autoriser la remise physique avec un solde restant',TRUE),
('service','update','service.labor.override','Déroger au tarif de main-d’œuvre','SAV & Atelier','Appliquer un tarif exceptionnel à un OR sans modifier le catalogue',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN(
 'parts.internal_request.view','parts.internal_request.prepare','parts.internal_delivery.dispatch',
 'service.parts.receive','service.parts.return','parts.return.receive','service.order.handover_unpaid',
 'parts.sale.release_unpaid','service.labor.override'
) WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
