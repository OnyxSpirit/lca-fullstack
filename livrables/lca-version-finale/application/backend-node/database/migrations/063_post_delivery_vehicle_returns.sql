-- Lot 9 : résolution post-livraison additive. Aucun historique existant n'est réécrit ni déduit.
CREATE TABLE post_delivery_vehicle_returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL,
  sale_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  concession_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  return_number VARCHAR(50) NOT NULL,
  request_reason_code ENUM('VEHICLE_DEFECT','NON_CONFORMITY','COMMERCIAL_AGREEMENT','CONTRACTUAL_WITHDRAWAL','OTHER') NOT NULL,
  request_description TEXT NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  requested_by BIGINT UNSIGNED NOT NULL,
  status ENUM('REQUESTED','INSPECTED','APPROVED','REJECTED','FINANCIALLY_RESOLVED','VEHICLE_RECEIVED','STOCK_DECIDED','CLOSED') NOT NULL DEFAULT 'REQUESTED',
  customer_name_snapshot VARCHAR(255) NOT NULL,
  vehicle_label_snapshot VARCHAR(255) NOT NULL,
  vin_snapshot VARCHAR(50) NOT NULL,
  sale_number_snapshot VARCHAR(50) NOT NULL,
  delivery_number_snapshot VARCHAR(50) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  delivery_mileage_snapshot INT UNSIGNED NULL,
  inspected_at DATETIME NULL, inspected_by BIGINT UNSIGNED NULL, return_mileage INT UNSIGNED NULL,
  general_condition VARCHAR(100) NULL, damages TEXT NULL, missing_items TEXT NULL, inspection_notes TEXT NULL,
  decision_at DATETIME NULL, decided_by BIGINT UNSIGNED NULL, decision_comment TEXT NULL,
  gross_credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  retained_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  credited_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  refundable_cash_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  refunded_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  financially_resolved_at DATETIME NULL, financially_resolved_by BIGINT UNSIGNED NULL,
  received_at DATETIME NULL, received_by BIGINT UNSIGNED NULL, received_vehicle_location_id BIGINT UNSIGNED NULL, reception_notes TEXT NULL,
  stock_decision ENUM('RESTOCK_USED','HOLD','RECONDITION') NULL,
  stock_decided_at DATETIME NULL, stock_decided_by BIGINT UNSIGNED NULL, stock_vehicle_location_id BIGINT UNSIGNED NULL, stock_notes TEXT NULL,
  closed_at DATETIME NULL, closed_by BIGINT UNSIGNED NULL,
  request_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_return_delivery (delivery_id),
  UNIQUE KEY uq_vehicle_return_number (return_number),
  UNIQUE KEY uq_vehicle_return_request (requested_by,request_id),
  KEY idx_vehicle_return_scope_status (concession_id,agency_id,status,id),
  KEY idx_vehicle_return_sale (sale_id,id), KEY idx_vehicle_return_vehicle (vehicle_id,id),
  CONSTRAINT chk_vehicle_return_amounts CHECK (gross_credit_amount>=0 AND retained_amount>=0 AND credited_amount>=0 AND refundable_cash_amount>=0 AND refunded_amount>=0 AND retained_amount+credited_amount<=gross_credit_amount+0.01 AND refunded_amount<=refundable_cash_amount+0.01),
  CONSTRAINT chk_vehicle_return_mileage CHECK (return_mileage IS NULL OR return_mileage>=delivery_mileage_snapshot),
  CONSTRAINT fk_vehicle_return_delivery FOREIGN KEY(delivery_id) REFERENCES deliveries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_sale FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_vehicle FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_requester FOREIGN KEY(requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_inspector FOREIGN KEY(inspected_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_financial FOREIGN KEY(financially_resolved_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_receiver FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_received_location FOREIGN KEY(received_vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_stock_decider FOREIGN KEY(stock_decided_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_stock_location FOREIGN KEY(stock_vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_closer FOREIGN KEY(closed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE post_delivery_vehicle_return_deductions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(80) NOT NULL, label VARCHAR(180) NOT NULL, description VARCHAR(1000) NOT NULL,
  amount DECIMAL(18,2) NOT NULL, created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  client_request_id CHAR(36) NOT NULL,
  UNIQUE KEY uq_vehicle_return_deduction_request (return_id,client_request_id), KEY idx_vehicle_return_deduction (return_id,id),
  CONSTRAINT chk_vehicle_return_deduction_amount CHECK(amount>0),
  CONSTRAINT fk_vehicle_return_deduction_return FOREIGN KEY(return_id) REFERENCES post_delivery_vehicle_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_deduction_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE post_delivery_vehicle_return_resolution_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL, invoice_id BIGINT UNSIGNED NOT NULL,
  resolution_action ENUM('CREDIT','KEEP') NOT NULL, invoice_total_snapshot DECIMAL(18,2) NOT NULL,
  prior_credit_snapshot DECIMAL(18,2) NOT NULL, gross_credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  retained_amount DECIMAL(18,2) NOT NULL DEFAULT 0, credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  credit_note_id BIGINT UNSIGNED NULL, rationale VARCHAR(1000) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_return_resolution_invoice(return_id,invoice_id), UNIQUE KEY uq_vehicle_return_credit_note(credit_note_id),
  CONSTRAINT chk_vehicle_return_resolution_amounts CHECK(invoice_total_snapshot>=0 AND prior_credit_snapshot>=0 AND gross_credit_amount>=0 AND retained_amount>=0 AND credit_amount>=0 AND retained_amount+credit_amount<=gross_credit_amount+0.01),
  CONSTRAINT fk_vehicle_return_resolution_return FOREIGN KEY(return_id) REFERENCES post_delivery_vehicle_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_resolution_invoice FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_resolution_credit FOREIGN KEY(credit_note_id) REFERENCES credit_notes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE post_delivery_vehicle_return_refunds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL, payment_refund_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_return_payment_refund(payment_refund_id), KEY idx_vehicle_return_refund(return_id,id),
  CONSTRAINT fk_vehicle_return_refund_return FOREIGN KEY(return_id) REFERENCES post_delivery_vehicle_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_refund_payment FOREIGN KEY(payment_refund_id) REFERENCES payment_refunds(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE post_delivery_vehicle_return_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL, event_type VARCHAR(80) NOT NULL,
  old_status VARCHAR(40) NULL, new_status VARCHAR(40) NULL, details JSON NULL, performed_by BIGINT UNSIGNED NOT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY idx_vehicle_return_event(return_id,occurred_at,id),
  CONSTRAINT fk_vehicle_return_event_return FOREIGN KEY(return_id) REFERENCES post_delivery_vehicle_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_event_user FOREIGN KEY(performed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,label,name,group_name,category,description,is_active) VALUES
('vehicles','view','vehicle.return.view','Voir les retours post-livraison','Voir les retours post-livraison','Véhicules','Véhicules','Consulter les dossiers de retour post-livraison',TRUE),
('vehicles','create','vehicle.return.create','Créer un retour post-livraison','Créer un retour post-livraison','Véhicules','Véhicules','Initier une demande de retour sur livraison finalisée',TRUE),
('vehicles','update','vehicle.return.inspect','Inspecter un véhicule retourné','Inspecter un véhicule retourné','Véhicules','Véhicules','Enregistrer le constat physique avant décision',TRUE),
('vehicles','approve','vehicle.return.approve','Décider un retour post-livraison','Décider un retour post-livraison','Véhicules','Véhicules','Approuver ou rejeter une demande de retour',TRUE),
('vehicles','manage','vehicle.return.financial.resolve','Résoudre financièrement un retour','Résoudre financièrement un retour','Véhicules','Véhicules','Créer les avoirs et remboursements justifiés',TRUE),
('vehicles','manage','vehicle.return.stock.receive','Réceptionner un véhicule retourné','Réceptionner un véhicule retourné','Véhicules','Véhicules','Réceptionner et décider la remise en stock',TRUE)
ON DUPLICATE KEY UPDATE label=VALUES(label),name=VALUES(name),group_name=VALUES(group_name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code LIKE 'vehicle.return.%'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE
ON DUPLICATE KEY UPDATE scope='GLOBAL';
