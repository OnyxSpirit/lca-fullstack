CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refresh_user (user_id),
  INDEX idx_refresh_expiry (expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Rend la configuration globale réellement unique sous MySQL.
DELETE older FROM settings older
JOIN settings newer ON newer.scope_type='global'
  AND newer.setting_key=older.setting_key
  AND newer.scope_id IS NULL
  AND older.scope_id IS NULL
  AND newer.id>older.id
WHERE older.scope_type='global';

UPDATE settings SET scope_id=0 WHERE scope_type='global' AND scope_id IS NULL;

ALTER TABLE leads
  ADD COLUMN priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium' AFTER status,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER assigned_user_id,
  ADD INDEX idx_lead_priority (priority),
  ADD INDEX idx_lead_created_by (created_by),
  ADD CONSTRAINT fk_lead_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Les lignes historiques sont attribuées à leur responsable actuel lorsque celui-ci existe.
UPDATE leads SET created_by=assigned_user_id WHERE created_by IS NULL;


ALTER TABLE customers
  ADD COLUMN customer_code VARCHAR(50) NULL AFTER id,
  ADD COLUMN agency_id BIGINT UNSIGNED NULL AFTER customer_type,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER assigned_user_id,
  ADD COLUMN civility ENUM('M.','Mme','Société') NULL AFTER customer_type,
  ADD COLUMN postal_code VARCHAR(30) NULL AFTER address,
  ADD COLUMN classification ENUM('occasional','regular','vip','at_risk') NOT NULL DEFAULT 'occasional' AFTER score,
  ADD COLUMN notes TEXT NULL AFTER classification;

UPDATE customers c LEFT JOIN users u ON u.id=c.assigned_user_id
SET c.agency_id=COALESCE(u.agency_id,(SELECT MIN(id) FROM agencies)),
    c.created_by=COALESCE(c.assigned_user_id,c.created_by),
    c.customer_code=CONCAT('CLI-',LPAD(c.id,6,'0'))
WHERE c.agency_id IS NULL OR c.customer_code IS NULL;

ALTER TABLE customers
  MODIFY customer_code VARCHAR(50) NOT NULL,
  MODIFY agency_id BIGINT UNSIGNED NOT NULL,
  ADD UNIQUE KEY uk_customer_code (customer_code),
  ADD INDEX idx_customer_agency (agency_id),
  ADD INDEX idx_customer_assigned (assigned_user_id),
  ADD INDEX idx_customer_classification (classification),
  ADD CONSTRAINT fk_customer_agency FOREIGN KEY (agency_id) REFERENCES agencies(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_customer_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE vehicles
  ADD COLUMN vehicle_type ENUM('new','used','demo','courtesy') NOT NULL DEFAULT 'new' AFTER supplier_id,
  ADD COLUMN body_type VARCHAR(60) NULL AFTER registration_number,
  ADD COLUMN first_registration_date DATE NULL AFTER year,
  ADD COLUMN interior_color VARCHAR(80) NULL AFTER color,
  ADD COLUMN fiscal_power SMALLINT UNSIGNED NULL AFTER transmission,
  ADD COLUMN real_power SMALLINT UNSIGNED NULL AFTER fiscal_power,
  ADD COLUMN co2_emissions SMALLINT UNSIGNED NULL AFTER real_power,
  ADD COLUMN refurbishment_cost DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER purchase_price,
  ADD COLUMN transport_cost DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER refurbishment_cost,
  ADD COLUMN administrative_cost DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER transport_cost,
  ADD COLUMN minimum_price DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER sale_price,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER notes,
  ADD COLUMN archived_at DATETIME NULL AFTER updated_at,
  ADD INDEX idx_vehicle_type (vehicle_type),
  ADD INDEX idx_vehicle_location (location_id),
  ADD INDEX idx_vehicle_entry (entry_date),
  ADD INDEX idx_vehicle_registration (registration_number),
  ADD CONSTRAINT fk_vehicle_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE vehicle_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500) NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_image_order (vehicle_id, sort_order),
  CONSTRAINT fk_vehicle_image_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_vehicle_image_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_features (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE vehicle_feature_assignments (
  vehicle_id BIGINT UNSIGNED NOT NULL,
  feature_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (vehicle_id, feature_id),
  CONSTRAINT fk_vfa_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_vfa_feature FOREIGN KEY (feature_id) REFERENCES vehicle_features(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE vehicle_price_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  old_sale_price DECIMAL(18,2) NULL,
  new_sale_price DECIMAL(18,2) NOT NULL,
  old_minimum_price DECIMAL(18,2) NULL,
  new_minimum_price DECIMAL(18,2) NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  reason VARCHAR(255) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_price_history (vehicle_id, changed_at),
  CONSTRAINT fk_vph_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_vph_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;


ALTER TABLE showroom_visits
  ADD COLUMN lead_id BIGINT UNSIGNED NULL AFTER customer_id,
  ADD COLUMN greeted_by BIGINT UNSIGNED NULL AFTER assigned_user_id,
  ADD COLUMN preferred_model VARCHAR(200) NULL AFTER reason,
  ADD COLUMN outcome ENUM('pending','lead_created','quotation','sale','no_interest','follow_up') NOT NULL DEFAULT 'pending' AFTER status,
  ADD COLUMN cancellation_reason VARCHAR(255) NULL AFTER completed_at,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER notes,
  ADD INDEX idx_showroom_agency_status_arrival (agency_id,status,arrival_at),
  ADD INDEX idx_showroom_phone (phone),
  ADD INDEX idx_showroom_lead (lead_id),
  ADD CONSTRAINT fk_showroom_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_showroom_greeter FOREIGN KEY (greeted_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE showroom_test_drives (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visit_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  lead_id BIGINT UNSIGNED NULL,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  advisor_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  driver_name VARCHAR(200) NOT NULL,
  driver_phone VARCHAR(50) NULL,
  license_number VARCHAR(100) NULL,
  mileage_out INT UNSIGNED NOT NULL,
  mileage_in INT UNSIGNED NULL,
  status ENUM('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
  started_at DATETIME NULL,
  returned_at DATETIME NULL,
  customer_feedback TEXT NULL,
  internal_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_test_drive_visit (visit_id),
  INDEX idx_test_drive_vehicle_status (vehicle_id,status),
  INDEX idx_test_drive_agency_date (agency_id,created_at),
  CONSTRAINT fk_td_visit FOREIGN KEY (visit_id) REFERENCES showroom_visits(id) ON DELETE CASCADE,
  CONSTRAINT fk_td_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_td_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_td_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_td_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_td_advisor FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_td_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;


ALTER TABLE deliveries
  ADD COLUMN delivery_specialist_id BIGINT UNSIGNED NULL AFTER agency_id,
  ADD COLUMN delivery_location VARCHAR(255) NULL AFTER scheduled_at,
  ADD COLUMN postponement_reason VARCHAR(500) NULL AFTER customer_notes,
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER postponement_reason,
  ADD COLUMN quality_notes TEXT NULL AFTER cancellation_reason,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER quality_notes,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD INDEX idx_delivery_agency_schedule (agency_id,scheduled_at),
  ADD INDEX idx_delivery_status_schedule (status,scheduled_at),
  ADD INDEX idx_delivery_specialist (delivery_specialist_id),
  ADD CONSTRAINT fk_delivery_specialist FOREIGN KEY (delivery_specialist_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_delivery_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE delivery_documents
  ADD COLUMN file_name VARCHAR(255) NULL AFTER document_url,
  ADD COLUMN mime_type VARCHAR(100) NULL AFTER file_name,
  ADD COLUMN file_size BIGINT UNSIGNED NULL AFTER mime_type,
  ADD COLUMN received_by BIGINT UNSIGNED NULL AFTER received,
  ADD COLUMN received_at DATETIME NULL AFTER received_by,
  ADD CONSTRAINT fk_delivery_document_receiver FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE delivery_signatures
  ADD COLUMN signed_by BIGINT UNSIGNED NULL AFTER signer_name,
  ADD COLUMN consent_text VARCHAR(500) NULL AFTER signature_data,
  ADD COLUMN document_hash CHAR(64) NULL AFTER consent_text,
  ADD CONSTRAINT fk_delivery_signature_user FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE delivery_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL,
  old_status ENUM('planned','preparing','quality_control','ready','delivered','cancelled') NULL,
  new_status ENUM('planned','preparing','quality_control','ready','delivered','cancelled') NOT NULL,
  reason VARCHAR(500) NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_delivery_history (delivery_id,changed_at),
  CONSTRAINT fk_delivery_history_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_checklist_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agency_id BIGINT UNSIGNED NULL,
  item_name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'quality',
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_delivery_template_agency (agency_id,is_active,sort_order),
  CONSTRAINT fk_delivery_template_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO delivery_checklist_templates(agency_id,item_name,category,is_required,sort_order) VALUES
(NULL,'Nettoyage intérieur','preparation',TRUE,10),
(NULL,'Nettoyage extérieur','preparation',TRUE,20),
(NULL,'Contrôle esthétique','quality',TRUE,30),
(NULL,'Contrôle mécanique','quality',TRUE,40),
(NULL,'Documents administratifs complets','documents',TRUE,50),
(NULL,'Accessoires installés','preparation',TRUE,60),
(NULL,'Carburant ou batterie chargé','preparation',TRUE,70),
(NULL,'Double des clés remis','handover',TRUE,80),
(NULL,'Présentation du véhicule au client','handover',TRUE,90),
(NULL,'Validation qualité finale','quality',TRUE,100);


ALTER TABLE repair_orders
 ADD COLUMN promised_completion_at DATETIME NULL AFTER received_at,
 ADD COLUMN warranty_covered BOOLEAN NOT NULL DEFAULT FALSE AFTER diagnosis_summary,
 ADD COLUMN warranty_reference VARCHAR(100) NULL AFTER warranty_covered,
 ADD COLUMN courtesy_vehicle_id BIGINT UNSIGNED NULL AFTER warranty_reference,
 ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER actual_total,
 ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER cancellation_reason,
 ADD CONSTRAINT fk_ro_courtesy_vehicle FOREIGN KEY(courtesy_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
 ADD CONSTRAINT fk_ro_created_by FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE repair_order_status_history(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,repair_order_id BIGINT UNSIGNED NOT NULL,old_status VARCHAR(40) NULL,new_status VARCHAR(40) NOT NULL,reason VARCHAR(500) NULL,changed_by BIGINT UNSIGNED NULL,changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX idx_ro_history(repair_order_id,changed_at),FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;
CREATE TABLE vehicle_reception_inspections(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,repair_order_id BIGINT UNSIGNED NOT NULL UNIQUE,fuel_level VARCHAR(50) NULL,cleanliness VARCHAR(100) NULL,bodywork_damage TEXT NULL,items_in_vehicle TEXT NULL,customer_signature LONGTEXT NULL,inspected_by BIGINT UNSIGNED NULL,inspected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,FOREIGN KEY(inspected_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;
CREATE TABLE repair_approvals(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,repair_order_id BIGINT UNSIGNED NOT NULL,approved BOOLEAN NOT NULL,approved_amount DECIMAL(18,2) NULL,customer_name VARCHAR(200) NOT NULL,signature_data LONGTEXT NULL,notes TEXT NULL,recorded_by BIGINT UNSIGNED NULL,recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,FOREIGN KEY(recorded_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;
CREATE TABLE part_reservations(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,repair_order_id BIGINT UNSIGNED NOT NULL,part_id BIGINT UNSIGNED NOT NULL,agency_id BIGINT UNSIGNED NOT NULL,quantity DECIMAL(12,2) NOT NULL,status ENUM('reserved','consumed','released') NOT NULL DEFAULT 'reserved',created_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE RESTRICT,FOREIGN KEY(agency_id) REFERENCES agencies(id),FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;


ALTER TABLE technicians
  ADD INDEX idx_technicians_agency_active (agency_id, is_active);

ALTER TABLE workshop_bays
  ADD COLUMN capacity SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER bay_type,
  ADD UNIQUE KEY uk_workshop_bay_agency_name (agency_id, name),
  ADD INDEX idx_workshop_bay_agency_status (agency_id, status);

ALTER TABLE schedules
  ADD COLUMN intervention_id BIGINT UNSIGNED NULL AFTER repair_order_id,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER notes,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
  ADD INDEX idx_schedule_agency_range (agency_id, starts_at, ends_at),
  ADD INDEX idx_schedule_technician_range (technician_id, starts_at, ends_at),
  ADD INDEX idx_schedule_bay_range (bay_id, starts_at, ends_at),
  ADD CONSTRAINT fk_schedule_intervention FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_schedule_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT chk_schedule_range CHECK (ends_at > starts_at);

ALTER TABLE work_sessions
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
  ADD INDEX idx_work_session_technician_status (technician_id, status),
  ADD INDEX idx_work_session_bay_status (bay_id, status),
  ADD CONSTRAINT fk_ws_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE time_entries
  ADD COLUMN work_session_id BIGINT UNSIGNED NULL AFTER intervention_id,
  ADD UNIQUE KEY uk_time_entry_session (work_session_id),
  ADD INDEX idx_time_entry_technician_date (technician_id, entry_date),
  ADD CONSTRAINT fk_time_session FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE SET NULL;

CREATE TABLE workshop_schedule_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  schedule_id BIGINT UNSIGNED NOT NULL,
  action ENUM('created','updated','cancelled') NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_schedule_history (schedule_id, changed_at),
  CONSTRAINT fk_schedule_history_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_schedule_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE technician_unavailabilities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  technician_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  reason VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_technician_unavailability_range (technician_id, starts_at, ends_at),
  CONSTRAINT chk_unavailability_range CHECK (ends_at > starts_at),
  CONSTRAINT fk_unavailability_technician FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  CONSTRAINT fk_unavailability_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- Stock PR multi-agence / multi-emplacement (migration additive).
-- Les colonnes current_stock/reserved_stock/min_stock/max_stock de parts sont désormais legacy ;
-- part_stocks est l'unique source d'autorité pour toute nouvelle écriture métier.
CREATE TABLE IF NOT EXISTS part_stocks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    location_key BIGINT UNSIGNED AS (IFNULL(location_id, 0)) STORED,
    current_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    reserved_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    min_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_part_stock_scope (part_id, agency_id, location_key),
    INDEX idx_part_stock_part (part_id),
    INDEX idx_part_stock_agency (agency_id),
    INDEX idx_part_stock_location (location_id),
    INDEX idx_part_stock_part_agency (part_id, agency_id),
    CONSTRAINT fk_part_stock_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_part_stock_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_part_stock_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE part_reservations
    ADD COLUMN location_id BIGINT UNSIGNED NULL AFTER agency_id,
    ADD COLUMN part_stock_id BIGINT UNSIGNED NULL AFTER location_id,
    ADD INDEX idx_part_reservation_stock (part_stock_id),
    ADD INDEX idx_part_reservation_scope (part_id, agency_id, location_id),
    ADD CONSTRAINT fk_part_reservation_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_part_reservation_stock FOREIGN KEY (part_stock_id) REFERENCES part_stocks(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Une affectation est automatique seulement si l'historique désigne exactement
-- une combinaison agence/emplacement. Les cas ambigus restent volontairement
-- sans part_stocks et doivent être affectés lors de l'inventaire initial.
INSERT INTO part_stocks(part_id,agency_id,location_id,current_stock,reserved_stock,min_stock,max_stock)
SELECT p.id,MIN(pm.agency_id),MIN(pm.location_id),p.current_stock,p.reserved_stock,p.min_stock,p.max_stock
FROM parts p JOIN part_movements pm ON pm.part_id=p.id
GROUP BY p.id,p.current_stock,p.reserved_stock,p.min_stock,p.max_stock
HAVING COUNT(DISTINCT CONCAT(pm.agency_id,':',IFNULL(pm.location_id,0)))=1
ON DUPLICATE KEY UPDATE id=id;

-- Une base réellement mono-agence peut recevoir les stocks sans historique
-- dans un emplacement non précisé, sans inventer une ventilation physique.
INSERT INTO part_stocks(part_id,agency_id,location_id,current_stock,reserved_stock,min_stock,max_stock)
SELECT p.id,MIN(a.id),NULL,p.current_stock,p.reserved_stock,p.min_stock,p.max_stock
FROM parts p CROSS JOIN agencies a
WHERE a.is_active=TRUE AND NOT EXISTS(SELECT 1 FROM part_stocks ps WHERE ps.part_id=p.id)
GROUP BY p.id,p.current_stock,p.reserved_stock,p.min_stock,p.max_stock
HAVING COUNT(a.id)=1
ON DUPLICATE KEY UPDATE id=id;

UPDATE part_reservations pr
JOIN part_stocks ps ON ps.part_id=pr.part_id AND ps.agency_id=pr.agency_id
JOIN (SELECT part_id,agency_id,COUNT(*) row_count FROM part_stocks GROUP BY part_id,agency_id) x
  ON x.part_id=ps.part_id AND x.agency_id=ps.agency_id AND x.row_count=1
SET pr.part_stock_id=ps.id,pr.location_id=ps.location_id
WHERE pr.part_stock_id IS NULL;


-- Données métier manquantes pour finaliser le cycle SAV/OR.
ALTER TABLE vehicle_reception_inspections
  ADD COLUMN mileage INT UNSIGNED NULL AFTER items_in_vehicle,
  ADD COLUMN observations TEXT NULL AFTER mileage;

ALTER TABLE repair_order_items
  ADD COLUMN part_stock_id BIGINT UNSIGNED NULL AFTER part_id,
  ADD COLUMN status ENUM('active','cancelled') NOT NULL DEFAULT 'active' AFTER line_total,
  ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN cancelled_at DATETIME NULL AFTER cancelled_by,
  ADD INDEX idx_roi_stock (part_stock_id),
  ADD CONSTRAINT fk_roi_stock FOREIGN KEY (part_stock_id) REFERENCES part_stocks(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_roi_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE repair_quality_controls (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id BIGINT UNSIGNED NOT NULL,
  planned_work_completed BOOLEAN NOT NULL DEFAULT FALSE,
  defect_corrected BOOLEAN NOT NULL DEFAULT FALSE,
  road_test_performed BOOLEAN NOT NULL DEFAULT FALSE,
  no_leaks BOOLEAN NOT NULL DEFAULT FALSE,
  levels_checked BOOLEAN NOT NULL DEFAULT FALSE,
  cleanliness_checked BOOLEAN NOT NULL DEFAULT FALSE,
  result ENUM('passed','failed') NOT NULL,
  reason VARCHAR(500) NULL,
  observations TEXT NULL,
  controlled_by BIGINT UNSIGNED NULL,
  controlled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_repair_qc_order_date (repair_order_id,controlled_at),
  CONSTRAINT fk_repair_qc_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_repair_qc_user FOREIGN KEY (controlled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_order_handovers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  customer_name VARCHAR(200) NOT NULL,
  mileage_out INT UNSIGNED NULL,
  observations TEXT NULL,
  signature_data LONGTEXT NULL,
  handed_over_by BIGINT UNSIGNED NULL,
  handed_over_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_repair_handover_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_repair_handover_user FOREIGN KEY (handed_over_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- Finalisation additive du magasin PR. La source d'autorité des quantités reste part_stocks.
ALTER TABLE parts ADD COLUMN oem_reference VARCHAR(120) NULL AFTER reference, ADD INDEX idx_parts_oem_reference (oem_reference);
ALTER TABLE part_categories ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER description;
ALTER TABLE suppliers ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
ALTER TABLE purchase_order_items ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER line_total, ADD INDEX idx_poi_order_part (purchase_order_id, part_id);

CREATE TABLE purchase_order_receipts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, purchase_order_id BIGINT UNSIGNED NOT NULL,
 receipt_number VARCHAR(80) NOT NULL, idempotency_key VARCHAR(120) NOT NULL,
 agency_id BIGINT UNSIGNED NOT NULL, location_id BIGINT UNSIGNED NULL, received_by BIGINT UNSIGNED NULL,
 notes TEXT NULL, received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_purchase_receipt_idempotency (purchase_order_id,idempotency_key), UNIQUE KEY uk_purchase_receipt_number (receipt_number),
 INDEX idx_purchase_receipt_date (purchase_order_id,received_at),
 FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT,
 FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
 FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE RESTRICT,
 FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE purchase_order_receipt_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, receipt_id BIGINT UNSIGNED NOT NULL,
 purchase_order_item_id BIGINT UNSIGNED NOT NULL, part_id BIGINT UNSIGNED NOT NULL, quantity DECIMAL(12,2) NOT NULL,
 UNIQUE KEY uk_receipt_item(receipt_id,purchase_order_item_id),
 FOREIGN KEY(receipt_id) REFERENCES purchase_order_receipts(id) ON DELETE CASCADE,
 FOREIGN KEY(purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
 FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE RESTRICT,
 CONSTRAINT chk_receipt_item_quantity CHECK(quantity>0)
) ENGINE=InnoDB;
ALTER TABLE part_movements
 ADD COLUMN stock_before DECIMAL(12,2) NULL AFTER quantity,
 ADD COLUMN stock_after DECIMAL(12,2) NULL AFTER stock_before,
 ADD COLUMN correlation_key VARCHAR(120) NULL AFTER reference_id,
 ADD INDEX idx_part_movement_correlation(correlation_key);


-- Compléments additifs de traçabilité financière et numérotation transactionnelle.
CREATE TABLE document_sequences (
  document_type VARCHAR(30) NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  sequence_year SMALLINT UNSIGNED NOT NULL,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY(document_type,agency_id,sequence_year),
  FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE invoices
  MODIFY COLUMN invoice_type ENUM('vehicle','workshop','parts','accessories','other','manual') NOT NULL,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER notes,
  ADD COLUMN idempotency_key VARCHAR(120) NULL AFTER created_by,
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER idempotency_key,
  ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER cancellation_reason,
  ADD COLUMN cancelled_at DATETIME NULL AFTER cancelled_by,
  ADD UNIQUE KEY uk_invoice_idempotency(idempotency_key),
  ADD INDEX idx_invoice_agency_dates(agency_id,issue_date,due_date,status),
  ADD CONSTRAINT fk_invoice_created_by FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_invoice_cancelled_by FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN idempotency_key VARCHAR(120) NULL AFTER notes,
  ADD COLUMN refund_reason VARCHAR(500) NULL AFTER idempotency_key,
  ADD COLUMN refunded_by BIGINT UNSIGNED NULL AFTER refund_reason,
  ADD COLUMN refunded_at DATETIME NULL AFTER refunded_by,
  ADD UNIQUE KEY uk_payment_idempotency(idempotency_key),
  ADD INDEX idx_payment_invoice_date(invoice_id,payment_date,status),
  ADD CONSTRAINT fk_payment_refunded_by FOREIGN KEY(refunded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE credit_notes
  ADD COLUMN idempotency_key VARCHAR(120) NULL AFTER issue_date,
  ADD UNIQUE KEY uk_credit_note_idempotency(idempotency_key),
  ADD INDEX idx_credit_invoice_date(invoice_id,issue_date,status);

-- 014_documents_ged_completion.sql
ALTER TABLE documents
  ADD COLUMN file_hash CHAR(64) NULL AFTER is_archived,
  ADD COLUMN expires_at DATE NULL AFTER file_hash,
  ADD COLUMN archived_at DATETIME NULL AFTER expires_at,
  ADD COLUMN archived_by BIGINT UNSIGNED NULL AFTER archived_at,
  ADD COLUMN archive_reason VARCHAR(500) NULL AFTER archived_by,
  ADD COLUMN parent_document_id BIGINT UNSIGNED NULL AFTER archive_reason,
  ADD INDEX idx_documents_archive_date (is_archived,created_at),
  ADD INDEX idx_documents_type (document_type),
  ADD INDEX idx_documents_hash_entity (entity_type,entity_id,file_hash),
  ADD INDEX idx_documents_parent (parent_document_id),
  ADD CONSTRAINT fk_documents_archived_by FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_documents_parent FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- 015_notifications_reliability.sql
ALTER TABLE notifications
  ADD COLUMN delivery_status ENUM('queued','sent','failed') NOT NULL DEFAULT 'sent' AFTER status,
  ADD COLUMN event_type VARCHAR(100) NULL AFTER reference_id,
  ADD COLUMN priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal' AFTER event_type,
  ADD COLUMN event_key VARCHAR(190) NULL AFTER priority,
  ADD INDEX idx_notifications_user_read_date(user_id,read_at,created_at),
  ADD INDEX idx_notifications_event_type(event_type),
  ADD UNIQUE INDEX uk_notifications_event_key(event_key);
UPDATE notifications SET read_at=COALESCE(read_at,created_at),delivery_status='sent' WHERE status='read';
UPDATE notifications SET delivery_status=CASE WHEN status='failed' THEN 'failed' WHEN status='queued' THEN 'queued' ELSE 'sent' END WHERE status<>'read';


-- Migration sûre Utilisateurs & RBAC.
-- Étape 1 : lister les comptes qui nécessitent une affectation métier explicite.
SELECT id,first_name,last_name,email FROM users WHERE agency_id IS NULL;

ALTER TABLE users ADD COLUMN avatar_path VARCHAR(500) NULL AFTER job_title;

-- Cette garde interrompt volontairement la migration si une agence ne peut pas
-- être déterminée sans ambiguïté. Affecter manuellement ces comptes puis rejouer.
DELIMITER $$
CREATE PROCEDURE ensure_users_have_agency()
BEGIN
  IF EXISTS(SELECT 1 FROM users WHERE agency_id IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='USERS_WITHOUT_AGENCY: affectation manuelle requise avant NOT NULL';
  END IF;
END$$
DELIMITER ;
CALL ensure_users_have_agency();
DROP PROCEDURE ensure_users_have_agency;

ALTER TABLE users
  MODIFY agency_id BIGINT UNSIGNED NOT NULL,
  DROP FOREIGN KEY fk_user_agency,
  ADD CONSTRAINT fk_user_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- users.email est déjà UNIQUE et user_roles possède déjà sa PK composite.
CREATE INDEX idx_users_agency_active ON users(agency_id,is_active);

-- 017_concession_settings.sql
-- Clés explicites au scope concession. Priorité TVA :
-- billing.default_vat_rate existant > defaultVatRate > default_vat_rate > erp_configuration > 18.9.
INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description)
SELECT 'concession',c.id,'billing.default_vat_rate',COALESCE(
 (SELECT s.setting_value FROM settings s WHERE s.setting_key='defaultVatRate' ORDER BY s.scope_type='concession' DESC LIMIT 1),
 (SELECT s.setting_value FROM settings s WHERE s.setting_key='default_vat_rate' ORDER BY s.scope_type='concession' DESC LIMIT 1),
 (SELECT JSON_EXTRACT(s.setting_value,'$.generalConfig.defaultVatRate') FROM settings s WHERE s.setting_key='erp_configuration' LIMIT 1),JSON_EXTRACT('18.9','$')),'TVA par défaut future'
FROM concessions c ON DUPLICATE KEY UPDATE setting_value=settings.setting_value;

INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description)
SELECT 'concession',c.id,k.setting_key,k.setting_value,'Tarif atelier horaire futur'
FROM concessions c JOIN (
 SELECT 'workshop.rate_t1' setting_key,JSON_EXTRACT('35000','$') setting_value UNION ALL
 SELECT 'workshop.rate_t2',JSON_EXTRACT('45000','$') UNION ALL
 SELECT 'workshop.rate_t3',JSON_EXTRACT('55000','$') UNION ALL
 SELECT 'workshop.rate_t4',JSON_EXTRACT('45000','$')
) k ON TRUE ON DUPLICATE KEY UPDATE setting_value=settings.setting_value;

-- Les anciennes lignes sont conservées pour audit et compatibilité Nest.
