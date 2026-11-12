CREATE TABLE accounting_schemes(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 domain_code VARCHAR(60) NOT NULL,
 event_type VARCHAR(80) NOT NULL,
 name VARCHAR(160) NOT NULL,
 journal_id BIGINT UNSIGNED NOT NULL,
 agency_id BIGINT UNSIGNED NULL,
 effective_from DATE NOT NULL,
 effective_to DATE NULL,
 status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_accounting_scheme_resolution(event_type,agency_id,status,effective_from,effective_to),
 CONSTRAINT chk_accounting_scheme_dates CHECK(effective_to IS NULL OR effective_to>=effective_from),
 CONSTRAINT fk_accounting_scheme_journal FOREIGN KEY(journal_id) REFERENCES accounting_journals(id),
 CONSTRAINT fk_accounting_scheme_agency FOREIGN KEY(agency_id) REFERENCES agencies(id),
 CONSTRAINT fk_accounting_scheme_creator FOREIGN KEY(created_by) REFERENCES users(id),
 CONSTRAINT fk_accounting_scheme_updater FOREIGN KEY(updated_by) REFERENCES users(id)
);

CREATE TABLE accounting_automation_control(
 id TINYINT UNSIGNED PRIMARY KEY,
 started_at DATETIME NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT chk_accounting_automation_singleton CHECK(id=1)
);
INSERT INTO accounting_automation_control(id,started_at,enabled) VALUES(1,NOW(),TRUE);

CREATE TABLE accounting_scheme_lines(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 scheme_id BIGINT UNSIGNED NOT NULL,
 line_order SMALLINT UNSIGNED NOT NULL,
 side ENUM('DEBIT','CREDIT') NOT NULL,
 amount_component ENUM('TOTAL','SUBTOTAL','TAX','AMOUNT') NOT NULL,
 account_source ENUM('FIXED','TREASURY') NOT NULL DEFAULT 'FIXED',
 account_id BIGINT UNSIGNED NULL,
 label VARCHAR(255) NOT NULL,
 UNIQUE KEY uq_accounting_scheme_line_order(scheme_id,line_order),
 CONSTRAINT chk_accounting_scheme_line_account CHECK((account_source='FIXED' AND account_id IS NOT NULL) OR account_source='TREASURY'),
 CONSTRAINT fk_accounting_scheme_line_scheme FOREIGN KEY(scheme_id) REFERENCES accounting_schemes(id) ON DELETE RESTRICT,
 CONSTRAINT fk_accounting_scheme_line_account FOREIGN KEY(account_id) REFERENCES accounting_accounts(id)
);

CREATE TABLE accounting_integration_events(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 source_type VARCHAR(80) NOT NULL,
 source_id VARCHAR(100) NOT NULL,
 event_type VARCHAR(80) NOT NULL,
 source_key VARCHAR(190) NOT NULL,
 agency_id BIGINT UNSIGNED NOT NULL,
 event_date DATE NOT NULL,
 currency_code CHAR(3) NOT NULL,
 reference VARCHAR(150) NOT NULL,
 label VARCHAR(255) NOT NULL,
 payload JSON NOT NULL,
 status ENUM('PENDING','PROCESSING','POSTED','FAILED','REGULARIZE','IGNORED') NOT NULL DEFAULT 'PENDING',
 accounting_entry_id BIGINT UNSIGNED NULL,
 attempts INT UNSIGNED NOT NULL DEFAULT 0,
 next_attempt_at DATETIME NULL,
 last_error VARCHAR(1000) NULL,
 discovered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 processed_at DATETIME NULL,
 created_by BIGINT UNSIGNED NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_accounting_integration_source(source_key),
 KEY idx_accounting_integration_queue(status,next_attempt_at,id),
 KEY idx_accounting_integration_scope(agency_id,event_date,status,id),
 CONSTRAINT fk_accounting_integration_agency FOREIGN KEY(agency_id) REFERENCES agencies(id),
 CONSTRAINT fk_accounting_integration_entry FOREIGN KEY(accounting_entry_id) REFERENCES accounting_entries(id),
 CONSTRAINT fk_accounting_integration_creator FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE accounting_integration_attempts(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 event_id BIGINT UNSIGNED NOT NULL,
 attempt_number INT UNSIGNED NOT NULL,
 status ENUM('POSTED','FAILED','REGULARIZE','DUPLICATE') NOT NULL,
 message VARCHAR(1000) NULL,
 accounting_entry_id BIGINT UNSIGNED NULL,
 actor_id BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_accounting_integration_attempt(event_id,attempt_number),
 CONSTRAINT fk_accounting_attempt_event FOREIGN KEY(event_id) REFERENCES accounting_integration_events(id) ON DELETE RESTRICT,
 CONSTRAINT fk_accounting_attempt_entry FOREIGN KEY(accounting_entry_id) REFERENCES accounting_entries(id),
 CONSTRAINT fk_accounting_attempt_actor FOREIGN KEY(actor_id) REFERENCES users(id)
);

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('accounting','view','accounting.scheme.view','Consulter les schémas comptables','Consulter les schémas comptables','Comptabilité & Trésorerie','Consulter les règles d’automatisation comptable',TRUE),
('accounting','manage','accounting.scheme.manage','Administrer les schémas comptables','Administrer les schémas comptables','Comptabilité & Trésorerie','Créer, modifier et activer les schémas comptables',TRUE),
('accounting','view','accounting.integration.view','Consulter les intégrations comptables','Consulter les intégrations comptables','Comptabilité & Trésorerie','Superviser les événements comptables automatisés',TRUE),
('accounting','view','accounting.integration.error.view','Consulter les erreurs comptables','Consulter les erreurs comptables','Comptabilité & Trésorerie','Consulter les motifs d’échec des intégrations',TRUE),
('accounting','retry','accounting.integration.retry','Relancer une intégration comptable','Relancer une intégration comptable','Comptabilité & Trésorerie','Relancer un événement en échec ou à régulariser',TRUE),
('accounting','export','accounting.integration.export','Exporter les intégrations comptables','Exporter les intégrations comptables','Comptabilité & Trésorerie','Exporter le journal des intégrations autorisées',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.code LIKE 'accounting.%'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
