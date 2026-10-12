CREATE TABLE employee_bonus_types (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concession_id BIGINT UNSIGNED NOT NULL,
 code VARCHAR(50) NOT NULL, label VARCHAR(120) NOT NULL, description VARCHAR(500) NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_bonus_type_concession_code(concession_id,code), UNIQUE KEY uk_bonus_type_concession_label(concession_id,label),
 KEY idx_bonus_type_active(concession_id,is_active,label),
 CONSTRAINT fk_bonus_type_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_bonus_type_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_bonus_type_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE employee_bonuses (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, employee_profile_id BIGINT UNSIGNED NOT NULL,
 concession_id BIGINT UNSIGNED NOT NULL, agency_id_snapshot BIGINT UNSIGNED NULL, bonus_type_id BIGINT UNSIGNED NOT NULL,
 type_code_snapshot VARCHAR(50) NOT NULL, type_label_snapshot VARCHAR(120) NOT NULL,
 amount DECIMAL(18,2) NOT NULL, currency_code CHAR(3) NOT NULL, reference_date DATE NOT NULL,
 period_start DATE NULL, period_end DATE NULL, reason VARCHAR(1000) NOT NULL,
 status ENUM('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
 submitted_by BIGINT UNSIGNED NULL, submitted_at DATETIME NULL,
 approved_by BIGINT UNSIGNED NULL, approved_at DATETIME NULL,
 rejected_by BIGINT UNSIGNED NULL, rejected_at DATETIME NULL, rejection_reason VARCHAR(1000) NULL,
 cancelled_by BIGINT UNSIGNED NULL, cancelled_at DATETIME NULL, cancellation_reason VARCHAR(1000) NULL,
 created_by BIGINT UNSIGNED NOT NULL, updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_bonus_employee_date(employee_profile_id,reference_date,id), KEY idx_bonus_employee_status(employee_profile_id,status,reference_date),
 KEY idx_bonus_scope(concession_id,agency_id_snapshot,status,reference_date), KEY idx_bonus_type(bonus_type_id,status),
 CONSTRAINT chk_bonus_amount CHECK(amount>0),
 CONSTRAINT chk_bonus_currency CHECK(currency_code REGEXP '^[A-Z]{3}$'),
 CONSTRAINT chk_bonus_period CHECK((period_start IS NULL AND period_end IS NULL) OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end>=period_start)),
 CONSTRAINT chk_bonus_state CHECK(
  (status='DRAFT' AND submitted_at IS NULL AND approved_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NULL) OR
  (status='PENDING' AND submitted_at IS NOT NULL AND approved_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NULL) OR
  (status='APPROVED' AND submitted_at IS NOT NULL AND approved_at IS NOT NULL AND rejected_at IS NULL AND cancelled_at IS NULL) OR
  (status='REJECTED' AND submitted_at IS NOT NULL AND rejected_at IS NOT NULL AND approved_at IS NULL AND cancelled_at IS NULL) OR
  (status='CANCELLED' AND cancelled_at IS NOT NULL AND rejected_at IS NULL)
 ),
 CONSTRAINT fk_bonus_employee FOREIGN KEY(employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
 CONSTRAINT fk_bonus_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_bonus_agency FOREIGN KEY(agency_id_snapshot) REFERENCES agencies(id) ON DELETE SET NULL,
 CONSTRAINT fk_bonus_type FOREIGN KEY(bonus_type_id) REFERENCES employee_bonus_types(id) ON DELETE RESTRICT,
 CONSTRAINT fk_bonus_submitter FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_bonus_approver FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_bonus_rejecter FOREIGN KEY(rejected_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_bonus_canceller FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_bonus_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_bonus_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','view','hr.bonus.view','Voir les primes employés','RH & Administration','Consulter les primes et leurs montants dans son périmètre',TRUE),
('hr','manage','hr.bonus.manage','Gérer les primes employés','RH & Administration','Créer, modifier, soumettre et annuler les primes du périmètre',TRUE),
('hr','approve','hr.bonus.approve','Décider les primes employés','RH & Administration','Approuver ou refuser les primes du périmètre',TRUE),
('hr','manage','hr.bonus.type.manage','Gérer les types de prime','RH & Administration','Configurer le catalogue concession des primes',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=TRUE;
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND p.code LIKE 'hr.bonus.%' ON DUPLICATE KEY UPDATE scope='GLOBAL';
