ALTER TABLE accounting_accounts
 ADD COLUMN level TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER account_class,
 ADD COLUMN normal_balance ENUM('DEBIT','CREDIT','BOTH') NOT NULL DEFAULT 'BOTH' AFTER account_type,
 ADD COLUMN source_origin VARCHAR(80) NOT NULL DEFAULT 'SYSCOHADA_REVISE_2017' AFTER normal_balance,
 ADD COLUMN effective_date DATE NOT NULL DEFAULT '2018-01-01' AFTER source_origin;

UPDATE accounting_accounts SET level=CHAR_LENGTH(number);

CREATE TABLE accounting_sequences(
 journal_id BIGINT UNSIGNED NOT NULL,
 fiscal_year_id BIGINT UNSIGNED NOT NULL,
 last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(journal_id,fiscal_year_id),
 CONSTRAINT fk_accounting_sequence_journal FOREIGN KEY(journal_id) REFERENCES accounting_journals(id),
 CONSTRAINT fk_accounting_sequence_year FOREIGN KEY(fiscal_year_id) REFERENCES accounting_fiscal_years(id)
);

CREATE TABLE accounting_entries(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 journal_id BIGINT UNSIGNED NOT NULL,
 fiscal_year_id BIGINT UNSIGNED NOT NULL,
 period_id BIGINT UNSIGNED NOT NULL,
 agency_id BIGINT UNSIGNED NULL,
 entry_number VARCHAR(60) NULL,
 draft_reference VARCHAR(80) NOT NULL,
 label VARCHAR(255) NOT NULL,
 accounting_date DATE NOT NULL,
 currency_code CHAR(3) NOT NULL DEFAULT 'XAF',
 status ENUM('DRAFT','VALIDATED','POSTED','REVERSED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
 external_reference VARCHAR(120) NULL,
 source_type VARCHAR(80) NOT NULL DEFAULT 'MANUAL',
 source_id VARCHAR(100) NULL,
 source_key VARCHAR(190) NULL,
 metadata JSON NULL,
 reversal_of_id BIGINT UNSIGNED NULL,
 reversed_by_id BIGINT UNSIGNED NULL,
 reversal_reason VARCHAR(500) NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_by BIGINT UNSIGNED NOT NULL,
 validated_by BIGINT UNSIGNED NULL,
 posted_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 validated_at DATETIME NULL,
 posted_at DATETIME NULL,
 UNIQUE KEY uq_accounting_entry_number(entry_number),
 UNIQUE KEY uq_accounting_entry_source(source_key),
 UNIQUE KEY uq_accounting_entry_reversal(reversal_of_id),
 KEY idx_accounting_entries_list(accounting_date,status,journal_id,agency_id,id),
 KEY idx_accounting_entries_period(period_id,status),
 KEY idx_accounting_entries_reference(draft_reference,external_reference),
 CONSTRAINT fk_accounting_entry_journal FOREIGN KEY(journal_id) REFERENCES accounting_journals(id),
 CONSTRAINT fk_accounting_entry_year FOREIGN KEY(fiscal_year_id) REFERENCES accounting_fiscal_years(id),
 CONSTRAINT fk_accounting_entry_period FOREIGN KEY(period_id) REFERENCES accounting_periods(id),
 CONSTRAINT fk_accounting_entry_agency FOREIGN KEY(agency_id) REFERENCES agencies(id),
 CONSTRAINT fk_accounting_entry_reversal FOREIGN KEY(reversal_of_id) REFERENCES accounting_entries(id),
 CONSTRAINT fk_accounting_entry_reversed_by FOREIGN KEY(reversed_by_id) REFERENCES accounting_entries(id),
 CONSTRAINT fk_accounting_entry_creator FOREIGN KEY(created_by) REFERENCES users(id),
 CONSTRAINT fk_accounting_entry_validator FOREIGN KEY(validated_by) REFERENCES users(id),
 CONSTRAINT fk_accounting_entry_poster FOREIGN KEY(posted_by) REFERENCES users(id)
);

CREATE TABLE accounting_entry_lines(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 entry_id BIGINT UNSIGNED NOT NULL,
 line_order SMALLINT UNSIGNED NOT NULL,
 account_id BIGINT UNSIGNED NOT NULL,
 agency_id BIGINT UNSIGNED NULL,
 label VARCHAR(255) NOT NULL,
 debit DECIMAL(19,2) NOT NULL DEFAULT 0,
 credit DECIMAL(19,2) NOT NULL DEFAULT 0,
 currency_code CHAR(3) NOT NULL DEFAULT 'XAF',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_accounting_entry_line_order(entry_id,line_order),
 KEY idx_accounting_lines_account(account_id,entry_id),
 CONSTRAINT chk_accounting_line_side CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0)),
 CONSTRAINT fk_accounting_line_entry FOREIGN KEY(entry_id) REFERENCES accounting_entries(id) ON DELETE RESTRICT,
 CONSTRAINT fk_accounting_line_account FOREIGN KEY(account_id) REFERENCES accounting_accounts(id),
 CONSTRAINT fk_accounting_line_agency FOREIGN KEY(agency_id) REFERENCES agencies(id)
);

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('accounting','view','accounting.entry.view','Consulter les écritures','Consulter les écritures','Comptabilité & Trésorerie','Consulter les pièces et lignes comptables autorisées',TRUE),
('accounting','create','accounting.entry.create','Créer une écriture','Créer une écriture','Comptabilité & Trésorerie','Créer une pièce comptable manuelle',TRUE),
('accounting','update','accounting.entry.update','Modifier un brouillon','Modifier un brouillon','Comptabilité & Trésorerie','Modifier les pièces au statut brouillon',TRUE),
('accounting','validate','accounting.entry.validate','Valider une écriture','Valider une écriture','Comptabilité & Trésorerie','Valider une pièce équilibrée',TRUE),
('accounting','post','accounting.entry.post','Comptabiliser une écriture','Comptabiliser une écriture','Comptabilité & Trésorerie','Attribuer un numéro définitif et comptabiliser',TRUE),
('accounting','reverse','accounting.entry.reverse','Contrepasser une écriture','Contrepasser une écriture','Comptabilité & Trésorerie','Créer une écriture inverse comptabilisée',TRUE),
('accounting','export','accounting.entry.export','Exporter les écritures','Exporter les écritures','Comptabilité & Trésorerie','Exporter les écritures accessibles',TRUE),
('accounting','view','accounting.entry.history.view','Consulter l’historique comptable','Consulter l’historique comptable','Comptabilité & Trésorerie','Consulter la traçabilité des écritures',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.code LIKE 'accounting.entry.%'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
