CREATE TABLE fiscal_tax_types(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 concession_id BIGINT UNSIGNED NOT NULL,
 code VARCHAR(60) NOT NULL,
 label VARCHAR(160) NOT NULL,
 description VARCHAR(1000) NULL,
 authority_name VARCHAR(190) NULL,
 filing_frequency ENUM('EVENT','MONTHLY','QUARTERLY','ANNUAL','OTHER') NOT NULL DEFAULT 'OTHER',
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_fiscal_tax_type_code(concession_id,code),
 CONSTRAINT fk_fiscal_tax_type_concession FOREIGN KEY(concession_id) REFERENCES concessions(id),
 CONSTRAINT fk_fiscal_tax_type_creator FOREIGN KEY(created_by) REFERENCES users(id),
 CONSTRAINT fk_fiscal_tax_type_updater FOREIGN KEY(updated_by) REFERENCES users(id)
);

CREATE TABLE fiscal_tax_rules(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tax_type_id BIGINT UNSIGNED NOT NULL,
 effective_from DATE NOT NULL,
 effective_to DATE NULL,
 rate_percent DECIMAL(9,6) NULL,
 fixed_amount DECIMAL(18,2) NULL,
 currency_code CHAR(3) NULL,
 calculation_parameters JSON NULL,
 legal_reference VARCHAR(500) NOT NULL,
 source_url VARCHAR(1000) NULL,
 verification_status ENUM('DRAFT','VERIFIED','RETIRED') NOT NULL DEFAULT 'DRAFT',
 verified_by BIGINT UNSIGNED NULL,
 verified_at DATETIME NULL,
 created_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_fiscal_rule_resolution(tax_type_id,verification_status,effective_from,effective_to),
 CONSTRAINT chk_fiscal_rule_dates CHECK(effective_to IS NULL OR effective_to>=effective_from),
 CONSTRAINT chk_fiscal_rule_amount CHECK(rate_percent IS NULL OR rate_percent>=0),
 CONSTRAINT chk_fiscal_rule_verification CHECK((verification_status='VERIFIED' AND verified_by IS NOT NULL AND verified_at IS NOT NULL) OR verification_status<>'VERIFIED'),
 CONSTRAINT fk_fiscal_rule_type FOREIGN KEY(tax_type_id) REFERENCES fiscal_tax_types(id),
 CONSTRAINT fk_fiscal_rule_verifier FOREIGN KEY(verified_by) REFERENCES users(id),
 CONSTRAINT fk_fiscal_rule_creator FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE fiscal_obligations(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 agency_id BIGINT UNSIGNED NOT NULL,
 concession_id BIGINT UNSIGNED NOT NULL,
 tax_type_id BIGINT UNSIGNED NOT NULL,
 rule_id BIGINT UNSIGNED NULL,
 reference VARCHAR(120) NOT NULL,
 period_start DATE NOT NULL,
 period_end DATE NOT NULL,
 due_date DATE NOT NULL,
 taxable_base DECIMAL(18,2) NULL,
 declared_amount DECIMAL(18,2) NULL,
 paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
 currency_code CHAR(3) NOT NULL,
 status ENUM('DRAFT','SUBMITTED','VALIDATED','REJECTED','PARTIALLY_PAID','PAID','CANCELLED') NOT NULL DEFAULT 'DRAFT',
 notes VARCHAR(4000) NULL,
 submitted_by BIGINT UNSIGNED NULL,
 submitted_at DATETIME NULL,
 decided_by BIGINT UNSIGNED NULL,
 decided_at DATETIME NULL,
 decision_reason VARCHAR(1000) NULL,
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_fiscal_obligation_reference(concession_id,reference),
 KEY idx_fiscal_obligation_scope(agency_id,due_date,status,id),
 CONSTRAINT chk_fiscal_obligation_dates CHECK(period_end>=period_start),
 CONSTRAINT chk_fiscal_obligation_amounts CHECK((taxable_base IS NULL OR taxable_base>=0) AND (declared_amount IS NULL OR declared_amount>=0) AND paid_amount>=0),
 CONSTRAINT fk_fiscal_obligation_agency FOREIGN KEY(agency_id) REFERENCES agencies(id),
 CONSTRAINT fk_fiscal_obligation_concession FOREIGN KEY(concession_id) REFERENCES concessions(id),
 CONSTRAINT fk_fiscal_obligation_type FOREIGN KEY(tax_type_id) REFERENCES fiscal_tax_types(id),
 CONSTRAINT fk_fiscal_obligation_rule FOREIGN KEY(rule_id) REFERENCES fiscal_tax_rules(id),
 CONSTRAINT fk_fiscal_obligation_submitter FOREIGN KEY(submitted_by) REFERENCES users(id),
 CONSTRAINT fk_fiscal_obligation_decider FOREIGN KEY(decided_by) REFERENCES users(id),
 CONSTRAINT fk_fiscal_obligation_creator FOREIGN KEY(created_by) REFERENCES users(id),
 CONSTRAINT fk_fiscal_obligation_updater FOREIGN KEY(updated_by) REFERENCES users(id)
);

CREATE TABLE fiscal_obligation_events(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 obligation_id BIGINT UNSIGNED NOT NULL,
 event_type VARCHAR(60) NOT NULL,
 old_status VARCHAR(30) NULL,
 new_status VARCHAR(30) NOT NULL,
 amount DECIMAL(18,2) NULL,
 reason VARCHAR(1000) NULL,
 actor_id BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_fiscal_obligation_event(obligation_id,id),
 CONSTRAINT fk_fiscal_event_obligation FOREIGN KEY(obligation_id) REFERENCES fiscal_obligations(id),
 CONSTRAINT fk_fiscal_event_actor FOREIGN KEY(actor_id) REFERENCES users(id)
);

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('fiscal','view','fiscal.obligation.view','Consulter les obligations fiscales','Consulter les obligations fiscales','Fiscalité','Consulter les échéances et déclarations du périmètre autorisé',TRUE),
('fiscal','manage','fiscal.obligation.manage','Préparer les obligations fiscales','Préparer les obligations fiscales','Fiscalité','Créer et corriger les obligations fiscales',TRUE),
('fiscal','submit','fiscal.obligation.submit','Soumettre les obligations fiscales','Soumettre les obligations fiscales','Fiscalité','Soumettre une obligation fiscale préparée',TRUE),
('fiscal','approve','fiscal.obligation.approve','Valider les obligations fiscales','Valider les obligations fiscales','Fiscalité','Valider ou rejeter une obligation fiscale soumise',TRUE),
('fiscal','pay','fiscal.obligation.pay','Enregistrer les règlements fiscaux','Enregistrer les règlements fiscaux','Fiscalité','Tracer les règlements d’obligations validées',TRUE),
('fiscal','manage','fiscal.catalog.manage','Administrer le référentiel fiscal','Administrer le référentiel fiscal','Fiscalité','Configurer les types et règles fiscales historisées',TRUE),
('fiscal','export','fiscal.reporting.export','Exporter les indicateurs fiscaux','Exporter les indicateurs fiscaux','Fiscalité','Exporter les échéances et montants fiscaux autorisés',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.code LIKE 'fiscal.%'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

-- Aucun taux ni montant réglementaire n'est amorcé ici : toute règle doit être
-- documentée puis explicitement vérifiée avant de devenir applicable.
