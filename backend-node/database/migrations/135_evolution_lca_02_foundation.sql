-- EVOLUTION-LCA-02 : adaptations additives, sans reprise destructive des historiques.
ALTER TABLE employee_profiles
  ADD COLUMN is_workshop_technician BOOLEAN NOT NULL DEFAULT FALSE AFTER employment_status,
  ADD INDEX idx_employee_workshop_eligibility (agency_id,employment_status,is_workshop_technician);

CREATE TABLE service_diagnostics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  diagnostic_number VARCHAR(80) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  advisor_id BIGINT UNSIGNED NOT NULL,
  vehicle_commercial_origin ENUM('CONCESSION','EXTERNAL','UNKNOWN') NOT NULL,
  mileage_in INT UNSIGNED NOT NULL,
  complaint TEXT NOT NULL,
  diagnosis_summary TEXT NULL,
  status ENUM('RECEIVED','IN_PROGRESS','FINALIZED','QUOTED','REFUSED','ACCEPTED') NOT NULL DEFAULT 'RECEIVED',
  tax_mode ENUM('TAXABLE','TAX_EXEMPT') NOT NULL DEFAULT 'TAXABLE',
  tax_justification VARCHAR(1000) NULL,
  vat_rate_snapshot DECIMAL(8,4) NOT NULL,
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  total DECIMAL(18,2) NOT NULL DEFAULT 0,
  quotation_number VARCHAR(80) NULL,
  quoted_at DATETIME NULL,
  refused_at DATETIME NULL,
  accepted_at DATETIME NULL,
  accepted_by BIGINT UNSIGNED NULL,
  repair_order_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_diagnostic_number (diagnostic_number),
  UNIQUE KEY uq_service_diagnostic_quotation (quotation_number),
  UNIQUE KEY uq_service_diagnostic_repair_order (repair_order_id),
  KEY idx_service_diagnostic_agency_status (agency_id,status,created_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE service_diagnostic_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  diagnostic_id BIGINT UNSIGNED NOT NULL,
  item_type ENUM('labor','part') NOT NULL,
  part_id BIGINT UNSIGNED NULL,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(18,2) NOT NULL,
  discount DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(8,4) NOT NULL,
  line_total DECIMAL(18,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_service_diagnostic_items (diagnostic_id,id),
  FOREIGN KEY (diagnostic_id) REFERENCES service_diagnostics(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
  CHECK (quantity>0 AND unit_price>=0 AND discount>=0)
) ENGINE=InnoDB;

CREATE TABLE intervention_technicians (
  intervention_id BIGINT UNSIGNED NOT NULL,
  employee_profile_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at DATETIME NULL,
  removed_by BIGINT UNSIGNED NULL,
  PRIMARY KEY (intervention_id,employee_profile_id),
  KEY idx_intervention_technician_employee (employee_profile_id,removed_at),
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE RESTRICT,
  FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (removed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Compatibilité de la décision créée automatiquement lors de l’acceptation.
ALTER TABLE repair_approvals
  MODIFY customer_name VARCHAR(200) NULL,
  ADD COLUMN comment TEXT NULL AFTER notes;

ALTER TABLE part_sales
  MODIFY customer_id BIGINT UNSIGNED NULL,
  ADD COLUMN customer_type ENUM('REGISTERED','THIRD_PARTY') NOT NULL DEFAULT 'REGISTERED' AFTER customer_id,
  ADD COLUMN third_party_name VARCHAR(200) NULL AFTER customer_type,
  ADD COLUMN third_party_phone VARCHAR(50) NULL AFTER third_party_name,
  ADD COLUMN third_party_address VARCHAR(500) NULL AFTER third_party_phone,
  ADD COLUMN tax_mode ENUM('TAXABLE','EXEMPT') NOT NULL DEFAULT 'TAXABLE' AFTER currency_code;

ALTER TABLE invoices
  MODIFY customer_id BIGINT UNSIGNED NULL,
  ADD COLUMN third_party_customer_name VARCHAR(200) NULL AFTER customer_id,
  ADD COLUMN third_party_customer_phone VARCHAR(50) NULL AFTER third_party_customer_name,
  ADD COLUMN third_party_customer_address VARCHAR(500) NULL AFTER third_party_customer_phone;

-- Le workflow de retour de vente directe existant journalise déjà ce type.
ALTER TABLE part_movements
  MODIFY COLUMN movement_type ENUM(
    'purchase','sale','repair_order','transfer_in','transfer_out','return',
    'inventory','adjustment','reservation','release','internal_delivery','sav_return','sale_return'
  ) NOT NULL;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('service','create','service.diagnostic.create','Créer un diagnostic','SAV / Atelier','Réceptionner un véhicule dans le parcours diagnostic',TRUE),
('service','view','service.diagnostic.view','Voir les diagnostics et devis','SAV / Atelier','Consulter les diagnostics et devis de son périmètre',TRUE),
('service','update','service.diagnostic.prepare','Préparer un devis SAV','SAV / Atelier','Réaliser le diagnostic et préparer son chiffrage',TRUE),
('service','approve','service.diagnostic.accept','Enregistrer l’acceptation d’un devis SAV','SAV / Atelier','Accepter le devis et créer transactionnellement l’OR',TRUE),
('hr','update','hr.employee.technician.manage','Identifier les techniciens','RH & Administration','Définir l’éligibilité technique d’un employé',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

-- Les attributions restent volontairement limitées à AGENCY ; aucun scope historique interdit n'est introduit.
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code IN(
 'service.diagnostic.create','service.diagnostic.view','service.diagnostic.prepare',
 'service.diagnostic.accept','hr.employee.technician.manage')
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE
ON DUPLICATE KEY UPDATE scope='AGENCY';
