CREATE TABLE accounting_reference_versions(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(40) NOT NULL UNIQUE,
 name VARCHAR(160) NOT NULL,
 source_url VARCHAR(500) NOT NULL,
 effective_date DATE NOT NULL,
 status ENUM('DRAFT','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
 notes TEXT NULL,
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_accounting_reference_creator FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE accounting_accounts(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 reference_version_id BIGINT UNSIGNED NOT NULL,
 parent_id BIGINT UNSIGNED NULL,
 number VARCHAR(20) NOT NULL,
 label VARCHAR(255) NOT NULL,
 account_class TINYINT UNSIGNED NOT NULL,
 account_type ENUM('BALANCE_SHEET','MANAGEMENT','SPECIAL') NOT NULL,
 is_reference BOOLEAN NOT NULL DEFAULT FALSE,
 is_postable BOOLEAN NOT NULL DEFAULT TRUE,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_accounting_account_number(reference_version_id,number),
 KEY idx_accounting_accounts_filters(account_class,account_type,is_active,number),
 CONSTRAINT chk_accounting_account_class CHECK(account_class BETWEEN 1 AND 9),
 CONSTRAINT fk_accounting_account_version FOREIGN KEY(reference_version_id) REFERENCES accounting_reference_versions(id),
 CONSTRAINT fk_accounting_account_parent FOREIGN KEY(parent_id) REFERENCES accounting_accounts(id),
 CONSTRAINT fk_accounting_account_creator FOREIGN KEY(created_by) REFERENCES users(id),
 CONSTRAINT fk_accounting_account_updater FOREIGN KEY(updated_by) REFERENCES users(id)
);

CREATE TABLE accounting_fiscal_years(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(30) NOT NULL UNIQUE,
 name VARCHAR(160) NOT NULL,
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 status ENUM('DRAFT','OPEN','CLOSED') NOT NULL DEFAULT 'DRAFT',
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT chk_accounting_year_dates CHECK(start_date<=end_date),
 CONSTRAINT fk_accounting_year_creator FOREIGN KEY(created_by) REFERENCES users(id),
 CONSTRAINT fk_accounting_year_updater FOREIGN KEY(updated_by) REFERENCES users(id)
);

CREATE TABLE accounting_periods(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 fiscal_year_id BIGINT UNSIGNED NOT NULL,
 period_number TINYINT UNSIGNED NOT NULL,
 name VARCHAR(80) NOT NULL,
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
 updated_by BIGINT UNSIGNED NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_accounting_period_number(fiscal_year_id,period_number),
 UNIQUE KEY uq_accounting_period_dates(fiscal_year_id,start_date,end_date),
 CONSTRAINT chk_accounting_period_number CHECK(period_number BETWEEN 1 AND 13),
 CONSTRAINT chk_accounting_period_dates CHECK(start_date<=end_date),
 CONSTRAINT fk_accounting_period_year FOREIGN KEY(fiscal_year_id) REFERENCES accounting_fiscal_years(id),
 CONSTRAINT fk_accounting_period_updater FOREIGN KEY(updated_by) REFERENCES users(id)
);

CREATE TABLE accounting_journals(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(12) NOT NULL UNIQUE,
 name VARCHAR(160) NOT NULL,
 journal_type ENUM('SALES','PURCHASES','BANK','CASH','MISCELLANEOUS','OPENING') NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_accounting_journal_creator FOREIGN KEY(created_by) REFERENCES users(id),
 CONSTRAINT fk_accounting_journal_updater FOREIGN KEY(updated_by) REFERENCES users(id)
);

CREATE TABLE accounting_treasury_mappings(
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 treasury_account_id BIGINT UNSIGNED NOT NULL,
 accounting_account_id BIGINT UNSIGNED NOT NULL,
 agency_id BIGINT UNSIGNED NULL,
 effective_from DATE NOT NULL,
 effective_to DATE NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_accounting_mapping_active(treasury_account_id,is_active,effective_from),
 CONSTRAINT chk_accounting_mapping_dates CHECK(effective_to IS NULL OR effective_to>=effective_from),
 CONSTRAINT fk_accounting_mapping_treasury FOREIGN KEY(treasury_account_id) REFERENCES treasury_accounts(id),
 CONSTRAINT fk_accounting_mapping_account FOREIGN KEY(accounting_account_id) REFERENCES accounting_accounts(id),
 CONSTRAINT fk_accounting_mapping_agency FOREIGN KEY(agency_id) REFERENCES agencies(id),
 CONSTRAINT fk_accounting_mapping_creator FOREIGN KEY(created_by) REFERENCES users(id),
 CONSTRAINT fk_accounting_mapping_updater FOREIGN KEY(updated_by) REFERENCES users(id)
);

INSERT INTO accounting_reference_versions(code,name,source_url,effective_date,status,notes)
VALUES('SYSCOHADA-REVISE-2017','SYSCOHADA révisé — structure de référence','https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/2/','2018-01-01','ACTIVE','Classes officielles de structure. Les subdivisions détaillées doivent être importées depuis une source autorisée puis validées par le professionnel comptable de LCA.')
ON DUPLICATE KEY UPDATE name=VALUES(name),source_url=VALUES(source_url),notes=VALUES(notes);

INSERT INTO accounting_accounts(reference_version_id,number,label,account_class,account_type,is_reference,is_postable)
SELECT v.id,x.number,x.label,x.class_no,x.kind,TRUE,FALSE FROM accounting_reference_versions v JOIN(
 SELECT '1' number,'Comptes de ressources durables' label,1 class_no,'BALANCE_SHEET' kind UNION ALL
 SELECT '2','Comptes de l’actif immobilisé',2,'BALANCE_SHEET' UNION ALL
 SELECT '3','Comptes de stocks',3,'BALANCE_SHEET' UNION ALL
 SELECT '4','Comptes de tiers',4,'BALANCE_SHEET' UNION ALL
 SELECT '5','Comptes de trésorerie',5,'BALANCE_SHEET' UNION ALL
 SELECT '6','Comptes de charges des activités ordinaires',6,'MANAGEMENT' UNION ALL
 SELECT '7','Comptes de produits des activités ordinaires',7,'MANAGEMENT' UNION ALL
 SELECT '8','Comptes des autres charges et des autres produits',8,'MANAGEMENT' UNION ALL
 SELECT '9','Comptes des engagements hors bilan et de la comptabilité analytique de gestion',9,'SPECIAL'
)x WHERE v.code='SYSCOHADA-REVISE-2017'
ON DUPLICATE KEY UPDATE label=VALUES(label),account_class=VALUES(account_class),account_type=VALUES(account_type),is_reference=TRUE,is_postable=FALSE;

INSERT INTO accounting_journals(code,name,journal_type,created_by)
SELECT x.code,x.name,x.kind,u.id FROM(SELECT 'VT' code,'Journal des ventes' name,'SALES' kind UNION ALL SELECT 'AC','Journal des achats','PURCHASES' UNION ALL SELECT 'BQ','Journal de banque','BANK' UNION ALL SELECT 'CA','Journal de caisse','CASH' UNION ALL SELECT 'OD','Journal des opérations diverses','MISCELLANEOUS' UNION ALL SELECT 'AN','Journal des à-nouveaux','OPENING')x CROSS JOIN(SELECT MIN(id) id FROM users WHERE is_active=TRUE)u WHERE u.id IS NOT NULL
ON DUPLICATE KEY UPDATE name=VALUES(name),journal_type=VALUES(journal_type);

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('accounting','view','accounting.chart.view','Consulter le plan comptable','Consulter le plan comptable','Comptabilité & Trésorerie','Consulter les comptes SYSCOHADA',TRUE),
('accounting','manage','accounting.chart.manage','Administrer le plan comptable','Administrer le plan comptable','Comptabilité & Trésorerie','Créer les subdivisions et gérer leur statut',TRUE),
('accounting','import','accounting.chart.import','Importer le plan comptable','Importer le plan comptable','Comptabilité & Trésorerie','Importer des comptes contrôlés',TRUE),
('accounting','export','accounting.chart.export','Exporter le plan comptable','Exporter le plan comptable','Comptabilité & Trésorerie','Exporter le référentiel accessible',TRUE),
('accounting','view','accounting.fiscal.view','Consulter les exercices','Consulter les exercices','Comptabilité & Trésorerie','Consulter exercices et périodes',TRUE),
('accounting','manage','accounting.fiscal.manage','Gérer les exercices','Gérer les exercices','Comptabilité & Trésorerie','Créer et modifier les exercices',TRUE),
('accounting','manage','accounting.period.manage','Gérer les périodes','Gérer les périodes','Comptabilité & Trésorerie','Ouvrir, fermer et rouvrir les périodes',TRUE),
('accounting','view','accounting.journal.view','Consulter les journaux comptables','Consulter les journaux comptables','Comptabilité & Trésorerie','Consulter le référentiel des journaux',TRUE),
('accounting','manage','accounting.journal.manage','Administrer les journaux comptables','Administrer les journaux comptables','Comptabilité & Trésorerie','Créer et gérer les journaux',TRUE),
('accounting','view','accounting.mapping.view','Consulter les liaisons comptables','Consulter les liaisons comptables','Comptabilité & Trésorerie','Consulter les liaisons Treasury/comptabilité',TRUE),
('accounting','manage','accounting.mapping.manage','Administrer les liaisons comptables','Administrer les liaisons comptables','Comptabilité & Trésorerie','Créer et désactiver les liaisons',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.code LIKE 'accounting.%'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
