CREATE TABLE employee_leave_types (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concession_id BIGINT UNSIGNED NOT NULL,
 code VARCHAR(50) NOT NULL, label VARCHAR(120) NOT NULL, description VARCHAR(500) NULL,
 requires_document BOOLEAN NOT NULL DEFAULT FALSE, requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_leave_type_concession_code(concession_id,code), UNIQUE KEY uk_leave_type_concession_label(concession_id,label),
 KEY idx_leave_type_active(concession_id,is_active,label),
 CONSTRAINT fk_leave_type_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_leave_type_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_leave_type_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE employee_leaves (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, employee_profile_id BIGINT UNSIGNED NOT NULL,
 concession_id BIGINT UNSIGNED NOT NULL, agency_id_snapshot BIGINT UNSIGNED NULL, leave_type_id BIGINT UNSIGNED NOT NULL,
 type_code_snapshot VARCHAR(50) NOT NULL, type_label_snapshot VARCHAR(120) NOT NULL,
 origin ENUM('EMPLOYEE_REQUEST','HR_ENTRY') NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
 reason VARCHAR(1000) NULL, status ENUM('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
 submitted_by BIGINT UNSIGNED NULL, submitted_at DATETIME NULL, decided_by BIGINT UNSIGNED NULL, decided_at DATETIME NULL,
 decision_reason VARCHAR(1000) NULL, cancelled_by BIGINT UNSIGNED NULL, cancelled_at DATETIME NULL, cancellation_reason VARCHAR(1000) NULL,
 created_by BIGINT UNSIGNED NOT NULL, updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_leave_employee_period(employee_profile_id,start_date,end_date), KEY idx_leave_employee_status(employee_profile_id,status,start_date),
 KEY idx_leave_scope(concession_id,agency_id_snapshot,status,start_date), KEY idx_leave_type(leave_type_id,status),
 CONSTRAINT chk_leave_dates CHECK(end_date>=start_date),
 CONSTRAINT chk_leave_state CHECK((status='DRAFT' AND submitted_at IS NULL AND decided_at IS NULL AND cancelled_at IS NULL) OR (status='PENDING' AND submitted_at IS NOT NULL AND decided_at IS NULL AND cancelled_at IS NULL) OR (status IN('APPROVED','REJECTED') AND submitted_at IS NOT NULL AND decided_at IS NOT NULL AND cancelled_at IS NULL) OR (status='CANCELLED' AND cancelled_at IS NOT NULL)),
 CONSTRAINT fk_leave_employee FOREIGN KEY(employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
 CONSTRAINT fk_leave_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_leave_agency FOREIGN KEY(agency_id_snapshot) REFERENCES agencies(id) ON DELETE SET NULL,
 CONSTRAINT fk_leave_type FOREIGN KEY(leave_type_id) REFERENCES employee_leave_types(id) ON DELETE RESTRICT,
 CONSTRAINT fk_leave_submitter FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_leave_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_leave_canceller FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_leave_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_leave_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','view','hr.leave.view','Voir les congés et absences','RH & Administration','Consulter les congés et absences dans son périmètre',TRUE),
('hr','create','hr.leave.request','Demander un congé ou une absence','RH & Administration','Créer et soumettre ses propres demandes',TRUE),
('hr','create','hr.leave.create','Enregistrer une absence','RH & Administration','Créer une demande ou absence pour un employé du périmètre',TRUE),
('hr','approve','hr.leave.approve','Décider les demandes d’absence','RH & Administration','Approuver ou refuser les demandes du périmètre',TRUE),
('hr','manage','hr.leave.manage','Gérer les congés et absences','RH & Administration','Modifier et annuler les absences du périmètre',TRUE),
('hr','manage','hr.leave.type.manage','Gérer les types de congé','RH & Administration','Configurer le catalogue concession',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=TRUE;
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND p.code LIKE 'hr.leave.%' ON DUPLICATE KEY UPDATE scope='GLOBAL';
