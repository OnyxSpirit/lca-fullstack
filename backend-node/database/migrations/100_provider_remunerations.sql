-- B.3.4.2.3 LOT 5 : constatations de rémunérations prestataires, sans effet financier.
CREATE TABLE provider_remunerations (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 provider_profile_id BIGINT UNSIGNED NOT NULL, provider_contract_id BIGINT UNSIGNED NOT NULL,
 provider_assignment_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NOT NULL, concession_id BIGINT UNSIGNED NOT NULL,
 installment_id BIGINT UNSIGNED NULL, source_kind ENUM('PERIOD','FIXED','INSTALLMENT') NOT NULL, generation_key VARCHAR(100) NOT NULL,
 period_start DATE NULL, period_end DATE NULL, gross_amount DECIMAL(15,2) NOT NULL,
 withholding_amount DECIMAL(15,2) NOT NULL DEFAULT 0, net_amount DECIMAL(15,2) GENERATED ALWAYS AS(gross_amount-withholding_amount) STORED,
 withholding_reason VARCHAR(1000) NULL, currency CHAR(3) NOT NULL DEFAULT 'XAF',
 status ENUM('DRAFT','SUBMITTED','VALIDATED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
 prepared_by BIGINT UNSIGNED NOT NULL, prepared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 submitted_by BIGINT UNSIGNED NULL, submitted_at DATETIME NULL, validated_by BIGINT UNSIGNED NULL, validated_at DATETIME NULL,
 rejected_by BIGINT UNSIGNED NULL, rejected_at DATETIME NULL, cancelled_by BIGINT UNSIGNED NULL, cancelled_at DATETIME NULL,
 decision_reason VARCHAR(1000) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_provider_rem_generation(provider_contract_id,generation_key),
 UNIQUE KEY uk_provider_rem_installment(installment_id),
 KEY idx_provider_rem_scope(agency_id,status,period_start), KEY idx_provider_rem_provider(provider_profile_id,status),
 CONSTRAINT chk_provider_rem_amounts CHECK(gross_amount>0 AND withholding_amount>=0 AND withholding_amount<gross_amount AND currency='XAF'),
 CONSTRAINT chk_provider_rem_withholding CHECK((withholding_amount=0 AND withholding_reason IS NULL) OR (withholding_amount>0 AND withholding_reason IS NOT NULL)),
 CONSTRAINT chk_provider_rem_period CHECK((source_kind='PERIOD' AND period_start IS NOT NULL AND period_end IS NOT NULL) OR (source_kind='FIXED' AND period_start IS NULL AND period_end IS NULL) OR (source_kind='INSTALLMENT' AND installment_id IS NOT NULL)),
 CONSTRAINT fk_provider_rem_profile FOREIGN KEY(provider_profile_id) REFERENCES provider_profiles(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_contract FOREIGN KEY(provider_contract_id) REFERENCES provider_contracts(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_assignment FOREIGN KEY(provider_assignment_id) REFERENCES provider_agency_assignments(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_installment FOREIGN KEY(installment_id) REFERENCES provider_contract_installments(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_preparer FOREIGN KEY(prepared_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_submitter FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_validator FOREIGN KEY(validated_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_rejector FOREIGN KEY(rejected_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_canceller FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE provider_remuneration_history (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, provider_remuneration_id BIGINT UNSIGNED NOT NULL,
 action VARCHAR(80) NOT NULL, from_status VARCHAR(30) NULL, to_status VARCHAR(30) NULL,
 reason VARCHAR(1000) NULL, snapshot JSON NULL, performed_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY idx_provider_rem_history(provider_remuneration_id,created_at,id),
 CONSTRAINT fk_provider_rem_history_rem FOREIGN KEY(provider_remuneration_id) REFERENCES provider_remunerations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_provider_rem_history_actor FOREIGN KEY(performed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('hr','view','hr.provider.remuneration.view','Consulter les rémunérations prestataires','Consulter les rémunérations prestataires','RH & Administration','Consultation territoriale des constatations prestataires',TRUE),
('hr','prepare','hr.provider.remuneration.prepare','Préparer les rémunérations prestataires','Préparer les rémunérations prestataires','RH & Administration','Préparation contrôlée sans effet financier',TRUE),
('hr','submit','hr.provider.remuneration.submit','Soumettre les rémunérations prestataires','Soumettre les rémunérations prestataires','RH & Administration','Soumission à validation',TRUE),
('hr','validate','hr.provider.remuneration.validate','Valider les rémunérations prestataires','Valider les rémunérations prestataires','RH & Administration','Validation de la constatation sans paiement',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.code LIKE 'hr.provider.remuneration.%'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
