-- EVOLUTION-LCA-03 : configuration salariale, valorisation du stock interne et contrats.
-- Les données historiques inconnues restent NULL ; aucune valeur financière n'est inventée.

CREATE TABLE employee_contribution_types (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 concession_id BIGINT UNSIGNED NOT NULL,
 code VARCHAR(50) NOT NULL,
 label VARCHAR(120) NOT NULL,
 description VARCHAR(500) NULL,
 contribution_side ENUM('EMPLOYEE','EMPLOYER') NOT NULL DEFAULT 'EMPLOYEE',
 calculation_mode ENUM('FIXED','PERCENTAGE') NOT NULL,
 calculation_value DECIMAL(18,4) NOT NULL,
 calculation_base ENUM('BASE_SALARY','GROSS_REMUNERATION') NULL,
 periodicity ENUM('MONTHLY','ONE_TIME') NOT NULL DEFAULT 'MONTHLY',
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_contribution_type_code(concession_id,code),
 UNIQUE KEY uk_contribution_type_label(concession_id,label),
 KEY idx_contribution_type_active(concession_id,is_active,label),
 CONSTRAINT chk_contribution_value CHECK(calculation_value>0),
 CONSTRAINT chk_contribution_base CHECK((calculation_mode='FIXED' AND calculation_base IS NULL) OR (calculation_mode='PERCENTAGE' AND calculation_base IS NOT NULL AND calculation_value<=100)),
 CONSTRAINT fk_contribution_type_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_contribution_type_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_contribution_type_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE employee_contribution_assignments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 employee_profile_id BIGINT UNSIGNED NOT NULL,
 contribution_type_id BIGINT UNSIGNED NOT NULL,
 effective_start DATE NOT NULL, effective_end DATE NULL,
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_contribution_assignment(employee_profile_id,contribution_type_id,effective_start),
 KEY idx_contribution_assignment_period(employee_profile_id,effective_start,effective_end),
 CONSTRAINT chk_contribution_assignment_dates CHECK(effective_end IS NULL OR effective_end>=effective_start),
 CONSTRAINT fk_contribution_assignment_employee FOREIGN KEY(employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
 CONSTRAINT fk_contribution_assignment_type FOREIGN KEY(contribution_type_id) REFERENCES employee_contribution_types(id) ON DELETE RESTRICT,
 CONSTRAINT fk_contribution_assignment_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE employee_leave_types ADD COLUMN remuneration_treatment ENUM('PAID','UNPAID') NOT NULL DEFAULT 'PAID' AFTER requires_approval;
ALTER TABLE employee_leaves ADD COLUMN payroll_deduction_amount DECIMAL(18,2) NULL AFTER reason,
 ADD CONSTRAINT chk_leave_payroll_deduction CHECK(payroll_deduction_amount IS NULL OR payroll_deduction_amount>0);

ALTER TABLE hr_remunerations
 ADD COLUMN gross_amount DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER bonus_amount,
 ADD COLUMN leave_deduction_amount DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER gross_amount,
 ADD COLUMN employee_contribution_amount DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER leave_deduction_amount,
 ADD COLUMN employer_contribution_amount DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER employee_contribution_amount;
UPDATE hr_remunerations SET gross_amount=salary_amount+bonus_amount WHERE gross_amount=0;

CREATE TABLE hr_remuneration_contributions (
 remuneration_id BIGINT UNSIGNED NOT NULL, assignment_id BIGINT UNSIGNED NOT NULL,
 contribution_type_id BIGINT UNSIGNED NOT NULL, code_snapshot VARCHAR(50) NOT NULL,
 label_snapshot VARCHAR(120) NOT NULL, side_snapshot ENUM('EMPLOYEE','EMPLOYER') NOT NULL,
 mode_snapshot ENUM('FIXED','PERCENTAGE') NOT NULL, value_snapshot DECIMAL(18,4) NOT NULL,
 base_snapshot ENUM('BASE_SALARY','GROSS_REMUNERATION') NULL, base_amount_snapshot DECIMAL(18,2) NULL,
 amount_snapshot DECIMAL(18,2) NOT NULL,
 PRIMARY KEY(remuneration_id,assignment_id),
 CONSTRAINT fk_rem_contribution_remuneration FOREIGN KEY(remuneration_id) REFERENCES hr_remunerations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_rem_contribution_assignment FOREIGN KEY(assignment_id) REFERENCES employee_contribution_assignments(id) ON DELETE RESTRICT,
 CONSTRAINT fk_rem_contribution_type FOREIGN KEY(contribution_type_id) REFERENCES employee_contribution_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE hr_remuneration_leave_deductions (
 remuneration_id BIGINT UNSIGNED NOT NULL, employee_leave_id BIGINT UNSIGNED NOT NULL,
 type_label_snapshot VARCHAR(120) NOT NULL, amount_snapshot DECIMAL(18,2) NOT NULL,
 PRIMARY KEY(remuneration_id,employee_leave_id), UNIQUE KEY uk_remuneration_leave(employee_leave_id),
 CONSTRAINT fk_rem_leave_remuneration FOREIGN KEY(remuneration_id) REFERENCES hr_remunerations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_rem_leave_leave FOREIGN KEY(employee_leave_id) REFERENCES employee_leaves(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE internal_stock_movements
 ADD COLUMN unit_acquisition_cost DECIMAL(18,2) NULL AFTER quantity_after,
 ADD COLUMN total_acquisition_cost DECIMAL(18,2) NULL AFTER unit_acquisition_cost,
 ADD COLUMN supporting_document_reference VARCHAR(190) NULL AFTER reference,
 ADD COLUMN accounting_reference VARCHAR(190) NULL AFTER supporting_document_reference,
 ADD COLUMN accounted_at DATETIME NULL AFTER accounting_reference,
 ADD UNIQUE KEY uk_internal_stock_accounting_reference(accounting_reference),
 ADD CONSTRAINT chk_internal_stock_acquisition_cost CHECK((unit_acquisition_cost IS NULL AND total_acquisition_cost IS NULL) OR (movement_type='entry' AND unit_acquisition_cost>0 AND total_acquisition_cost>0));

CREATE TABLE internal_stock_assignments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, item_id BIGINT UNSIGNED NOT NULL,
 employee_profile_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NOT NULL,
 quantity DECIMAL(12,3) NOT NULL, assigned_at DATE NOT NULL, returned_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
 returned_at DATE NULL, status ENUM('ASSIGNED','PARTIALLY_RETURNED','RETURNED') NOT NULL DEFAULT 'ASSIGNED',
 notes VARCHAR(500) NULL, created_by BIGINT UNSIGNED NOT NULL, updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_stock_assignment_item(item_id,status), KEY idx_stock_assignment_employee(employee_profile_id,status),
 CONSTRAINT chk_stock_assignment_quantities CHECK(quantity>0 AND returned_quantity>=0 AND returned_quantity<=quantity),
 CONSTRAINT fk_stock_assignment_item FOREIGN KEY(item_id) REFERENCES internal_stock_items(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stock_assignment_employee FOREIGN KEY(employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stock_assignment_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stock_assignment_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stock_assignment_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE employee_contract_types
 ADD COLUMN duration_kind ENUM('FIXED_TERM','INDEFINITE') NOT NULL DEFAULT 'INDEFINITE' AFTER description,
 ADD COLUMN standard_duration_months SMALLINT UNSIGNED NULL AFTER duration_kind,
 ADD CONSTRAINT chk_contract_type_duration CHECK((duration_kind='INDEFINITE' AND standard_duration_months IS NULL) OR (duration_kind='FIXED_TERM' AND standard_duration_months BETWEEN 1 AND 600));
ALTER TABLE employee_contracts
 ADD COLUMN duration_kind_snapshot ENUM('FIXED_TERM','INDEFINITE') NOT NULL DEFAULT 'INDEFINITE' AFTER type_name_snapshot,
 ADD COLUMN duration_months_snapshot SMALLINT UNSIGNED NULL AFTER duration_kind_snapshot;
UPDATE employee_contracts SET duration_kind_snapshot=CASE WHEN contractual_end_date IS NULL THEN 'INDEFINITE' ELSE 'FIXED_TERM' END,
 duration_months_snapshot=CASE WHEN contractual_end_date IS NULL THEN NULL ELSE GREATEST(1,TIMESTAMPDIFF(MONTH,start_date,DATE_ADD(contractual_end_date,INTERVAL 1 DAY))) END;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','view','hr.contribution.view','Voir les cotisations','RH & Administration','Consulter les cotisations configurées et affectées',TRUE),
('hr','manage','hr.contribution.manage','Configurer les cotisations','RH & Administration','Créer, modifier et désactiver les types de cotisations',TRUE),
('hr','assign','hr.contribution.assign','Affecter les cotisations','RH & Administration','Gérer les cotisations des employés autorisés',TRUE),
('hr','view','hr.stock.acquisition.view','Voir les acquisitions du stock interne','RH & Administration','Consulter les coûts historiques sans accès aux salaires',TRUE),
('hr','manage','hr.stock.acquisition.manage','Gérer les acquisitions du stock interne','RH & Administration','Saisir les coûts et références comptables',TRUE),
('hr','manage','hr.stock.assignment.manage','Affecter le stock interne','RH & Administration','Affecter et retourner du matériel sans retenue salariale',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND p.code IN('hr.contribution.view','hr.contribution.manage','hr.contribution.assign','hr.stock.acquisition.view','hr.stock.acquisition.manage','hr.stock.assignment.manage')
ON DUPLICATE KEY UPDATE scope='AGENCY';
