CREATE TABLE hr_remunerations (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 employee_profile_id BIGINT UNSIGNED NOT NULL,concession_id BIGINT UNSIGNED NOT NULL,agency_id BIGINT UNSIGNED NULL,
 period_start DATE NOT NULL,period_end DATE NOT NULL,kind ENUM('MAIN','ADJUSTMENT') NOT NULL DEFAULT 'MAIN',
 salary_history_id BIGINT UNSIGNED NOT NULL,salary_amount DECIMAL(18,2) NOT NULL,bonus_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
 payable_amount DECIMAL(18,2) NOT NULL,currency_code CHAR(3) NOT NULL,
 validation_status ENUM('DRAFT','SUBMITTED','VALIDATED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
 budget_expense_id BIGINT UNSIGNED NULL,prepared_by BIGINT UNSIGNED NOT NULL,submitted_by BIGINT UNSIGNED NULL,submitted_at DATETIME NULL,
 validated_by BIGINT UNSIGNED NULL,validated_at DATETIME NULL,rejected_by BIGINT UNSIGNED NULL,rejected_at DATETIME NULL,decision_reason VARCHAR(1000) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_hr_remuneration_period(employee_profile_id,period_start,kind),UNIQUE KEY uq_hr_remuneration_expense(budget_expense_id),
 KEY idx_hr_remuneration_scope(concession_id,agency_id,period_start,validation_status),
 CONSTRAINT chk_hr_remuneration_period CHECK(period_start=DATE_FORMAT(period_start,'%Y-%m-01') AND period_end=LAST_DAY(period_start)),
 CONSTRAINT chk_hr_remuneration_amounts CHECK(salary_amount>0 AND bonus_amount>=0 AND payable_amount>0),
 CONSTRAINT fk_hr_remuneration_employee FOREIGN KEY(employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_remuneration_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_remuneration_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_remuneration_salary FOREIGN KEY(salary_history_id) REFERENCES salary_history(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_remuneration_expense FOREIGN KEY(budget_expense_id) REFERENCES budget_expenses(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_remuneration_preparer FOREIGN KEY(prepared_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_remuneration_submitter FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_hr_remuneration_validator FOREIGN KEY(validated_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_hr_remuneration_rejecter FOREIGN KEY(rejected_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE hr_remuneration_bonuses(
 remuneration_id BIGINT UNSIGNED NOT NULL,employee_bonus_id BIGINT UNSIGNED NOT NULL,amount_snapshot DECIMAL(18,2) NOT NULL,
 PRIMARY KEY(remuneration_id,employee_bonus_id),UNIQUE KEY uq_hr_remuneration_bonus(employee_bonus_id),
 CONSTRAINT fk_hr_remuneration_bonus_remuneration FOREIGN KEY(remuneration_id) REFERENCES hr_remunerations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_remuneration_bonus_bonus FOREIGN KEY(employee_bonus_id) REFERENCES employee_bonuses(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE hr_remuneration_history(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,remuneration_id BIGINT UNSIGNED NOT NULL,
 action ENUM('PREPARED','ADJUSTED','SUBMITTED','VALIDATED','REJECTED','ENGAGED','PAYMENT_REQUESTED') NOT NULL,
 old_status VARCHAR(30) NULL,new_status VARCHAR(30) NULL,amount DECIMAL(18,2) NULL,reason VARCHAR(1000) NULL,actor_id BIGINT UNSIGNED NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_hr_remuneration_history(remuneration_id,created_at,id),
 CONSTRAINT fk_hr_remuneration_history_rem FOREIGN KEY(remuneration_id) REFERENCES hr_remunerations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_remuneration_history_actor FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','view','hr.remuneration.view','Voir les rémunérations','RH & Administration','Consulter les rémunérations sensibles de son périmètre',TRUE),
('hr','create','hr.remuneration.prepare','Préparer les rémunérations','RH & Administration','Préparer les rémunérations par période',TRUE),
('hr','submit','hr.remuneration.submit','Soumettre les rémunérations','RH & Administration','Soumettre une rémunération préparée',TRUE),
('hr','approve','hr.remuneration.validate','Valider les rémunérations','RH & Administration','Valider ou rejeter une rémunération soumise',TRUE),
('hr','create','hr.remuneration.engage','Imputer les rémunérations','RH & Administration','Créer la dépense budgétaire FIN-02 liée',TRUE),
('hr','pay','hr.remuneration.pay','Payer les rémunérations','RH & Administration','Déclencher le décaissement budgétaire existant',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code LIKE 'hr.remuneration.%' WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
