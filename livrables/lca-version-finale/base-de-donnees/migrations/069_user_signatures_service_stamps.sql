CREATE TABLE user_signature_versions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, version INT UNSIGNED NOT NULL,
 file_url VARCHAR(500) NOT NULL, mime_type ENUM('image/png','image/jpeg') NOT NULL, file_size INT UNSIGNED NOT NULL, file_hash CHAR(64) NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, active_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN is_active THEN user_id ELSE NULL END) STORED,
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_by BIGINT UNSIGNED NULL, revoked_at DATETIME NULL,
 UNIQUE KEY uq_user_signature_version(user_id,version), UNIQUE KEY uq_user_signature_active(active_user_id), KEY idx_user_signature_history(user_id,created_at,id),
 CONSTRAINT chk_user_signature_state CHECK((is_active=TRUE AND revoked_at IS NULL AND revoked_by IS NULL) OR (is_active=FALSE AND revoked_at IS NOT NULL)),
 CONSTRAINT fk_user_signature_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_user_signature_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_user_signature_revoker FOREIGN KEY(revoked_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE service_stamps (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concession_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NULL, department_id BIGINT UNSIGNED NULL,
 name VARCHAR(150) NOT NULL, document_context ENUM('DELIVERY_REPORT') NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by BIGINT UNSIGNED NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_service_stamp_scope(concession_id,agency_id,department_id,document_context,is_active),
 CONSTRAINT chk_service_stamp_scope CHECK(department_id IS NULL OR agency_id IS NOT NULL),
 CONSTRAINT fk_service_stamp_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_service_stamp_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
 CONSTRAINT fk_service_stamp_department FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE RESTRICT,
 CONSTRAINT fk_service_stamp_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_service_stamp_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE service_stamp_versions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, stamp_id BIGINT UNSIGNED NOT NULL, version INT UNSIGNED NOT NULL,
 file_url VARCHAR(500) NOT NULL, mime_type ENUM('image/png','image/jpeg') NOT NULL, file_size INT UNSIGNED NOT NULL, file_hash CHAR(64) NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, active_stamp_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN is_active THEN stamp_id ELSE NULL END) STORED,
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_by BIGINT UNSIGNED NULL, revoked_at DATETIME NULL,
 UNIQUE KEY uq_service_stamp_version(stamp_id,version), UNIQUE KEY uq_service_stamp_active(active_stamp_id), KEY idx_service_stamp_version_history(stamp_id,created_at,id),
 CONSTRAINT chk_service_stamp_version_state CHECK((is_active=TRUE AND revoked_at IS NULL AND revoked_by IS NULL) OR (is_active=FALSE AND revoked_at IS NOT NULL)),
 CONSTRAINT fk_service_stamp_version_stamp FOREIGN KEY(stamp_id) REFERENCES service_stamps(id) ON DELETE RESTRICT,
 CONSTRAINT fk_service_stamp_version_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_service_stamp_version_revoker FOREIGN KEY(revoked_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE document_mark_snapshots (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, document_id BIGINT UNSIGNED NOT NULL UNIQUE, document_context ENUM('DELIVERY_REPORT') NOT NULL,
 signer_user_id BIGINT UNSIGNED NULL, signature_version_id BIGINT UNSIGNED NULL, signature_identity_snapshot VARCHAR(255) NULL, signature_hash CHAR(64) NULL,
 stamp_id BIGINT UNSIGNED NULL, stamp_version_id BIGINT UNSIGNED NULL, stamp_identity_snapshot VARCHAR(255) NULL, stamp_hash CHAR(64) NULL,
 applied_by BIGINT UNSIGNED NOT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT chk_document_mark_present CHECK(signature_version_id IS NOT NULL OR stamp_version_id IS NOT NULL),
 CONSTRAINT fk_document_mark_document FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_mark_signer FOREIGN KEY(signer_user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_mark_signature FOREIGN KEY(signature_version_id) REFERENCES user_signature_versions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_mark_stamp FOREIGN KEY(stamp_id) REFERENCES service_stamps(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_mark_stamp_version FOREIGN KEY(stamp_version_id) REFERENCES service_stamp_versions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_mark_applier FOREIGN KEY(applied_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE delivery_signatures
 ADD COLUMN user_signature_version_id BIGINT UNSIGNED NULL AFTER signed_by,
 ADD COLUMN service_stamp_version_id BIGINT UNSIGNED NULL AFTER user_signature_version_id,
 ADD CONSTRAINT fk_delivery_user_signature_version FOREIGN KEY(user_signature_version_id) REFERENCES user_signature_versions(id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_delivery_service_stamp_version FOREIGN KEY(service_stamp_version_id) REFERENCES service_stamp_versions(id) ON DELETE RESTRICT;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('documents','view','signature.view.self','Voir sa signature','Documents & Gouvernance','Consulter sa signature visuelle active',TRUE),
('documents','manage','signature.manage.self','Gérer sa signature','Documents & Gouvernance','Importer, remplacer ou révoquer sa propre signature visuelle',TRUE),
('documents','view','stamp.view','Voir les cachets','Documents & Gouvernance','Consulter les cachets institutionnels dans son périmètre',TRUE),
('documents','manage','stamp.manage','Gérer les cachets','Documents & Gouvernance','Créer, versionner et désactiver les cachets institutionnels',TRUE),
('documents','use','stamp.use','Utiliser un cachet','Documents & Gouvernance','Apposer un cachet compatible sur un document officiel',TRUE),
('documents','apply','document.signature.apply','Apposer sa signature','Documents & Gouvernance','Apposer sa signature visuelle active sur un document compatible',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN('signature.view.self','signature.manage.self','stamp.view','stamp.manage','stamp.use','document.signature.apply')
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
ON DUPLICATE KEY UPDATE scope='GLOBAL';
