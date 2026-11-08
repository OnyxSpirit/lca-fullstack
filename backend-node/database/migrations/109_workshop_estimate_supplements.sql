CREATE TABLE repair_estimate_supplements (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 supplement_number VARCHAR(80) NOT NULL,
 repair_order_id BIGINT UNSIGNED NOT NULL,
 status ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
 reason VARCHAR(1000) NOT NULL,
 submitted_amount DECIMAL(18,2) NOT NULL,
 customer_name VARCHAR(200) NULL,
 signature_data MEDIUMTEXT NULL,
 decision_notes TEXT NULL,
 request_key VARCHAR(64) NOT NULL,
 created_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 decided_by BIGINT UNSIGNED NULL,
 decided_at DATETIME NULL,
 UNIQUE KEY uq_repair_supplement_number(supplement_number),
 UNIQUE KEY uq_repair_supplement_request(repair_order_id,request_key),
 CHECK(submitted_amount>0),
 FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE RESTRICT,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE repair_estimate_supplement_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 supplement_id BIGINT UNSIGNED NOT NULL,
 part_id BIGINT UNSIGNED NULL,
 labor_rate_id BIGINT UNSIGNED NULL,
 item_type ENUM('labor','part') NOT NULL,
 description VARCHAR(255) NOT NULL,
 quantity DECIMAL(12,2) NOT NULL,
 unit_price DECIMAL(18,2) NOT NULL,
 discount DECIMAL(18,2) NOT NULL DEFAULT 0,
 tax_rate DECIMAL(8,4) NOT NULL,
 line_total DECIMAL(18,2) NOT NULL,
 CHECK(quantity>0 AND unit_price>=0 AND discount>=0 AND line_total>=0),
 CHECK((item_type='part' AND part_id IS NOT NULL AND labor_rate_id IS NULL) OR (item_type='labor' AND part_id IS NULL AND labor_rate_id IS NOT NULL)),
 FOREIGN KEY(supplement_id) REFERENCES repair_estimate_supplements(id) ON DELETE CASCADE,
 FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE RESTRICT,
 FOREIGN KEY(labor_rate_id) REFERENCES workshop_labor_rates(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE repair_order_estimate_items ADD COLUMN supplement_id BIGINT UNSIGNED NULL AFTER repair_order_id,ADD KEY idx_estimate_supplement(supplement_id),ADD CONSTRAINT fk_estimate_supplement FOREIGN KEY(supplement_id) REFERENCES repair_estimate_supplements(id) ON DELETE RESTRICT;
ALTER TABLE sav_part_requests MODIFY accepted_approval_id BIGINT UNSIGNED NULL,ADD COLUMN supplement_id BIGINT UNSIGNED NULL AFTER accepted_approval_id,ADD UNIQUE KEY uq_sav_part_request_supplement(supplement_id),ADD CONSTRAINT fk_sav_request_supplement FOREIGN KEY(supplement_id) REFERENCES repair_estimate_supplements(id) ON DELETE RESTRICT,ADD CONSTRAINT chk_sav_request_origin CHECK((accepted_approval_id IS NOT NULL AND supplement_id IS NULL) OR (accepted_approval_id IS NULL AND supplement_id IS NOT NULL));

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('service','create','service.estimate.supplement.create','Créer un complément de devis','SAV / Atelier','Soumettre des travaux ou pièces supplémentaires',TRUE),
('service','approve','service.estimate.supplement.approve','Décider un complément de devis','SAV / Atelier','Enregistrer la décision du client sur un complément',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN('service.estimate.supplement.create','service.estimate.supplement.approve') WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
