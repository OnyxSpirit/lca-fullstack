CREATE TABLE service_stamp_categories (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 concession_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(120) NOT NULL,
 description VARCHAR(500) NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_stamp_category_name(concession_id,name),
 KEY idx_stamp_category_active(concession_id,is_active,name),
 CONSTRAINT fk_stamp_category_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stamp_category_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stamp_category_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE service_stamps
 ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER department_id,
 MODIFY document_context VARCHAR(50) NOT NULL,
 ADD KEY idx_service_stamp_category(category_id,is_active),
 ADD CONSTRAINT fk_service_stamp_category FOREIGN KEY(category_id) REFERENCES service_stamp_categories(id) ON DELETE RESTRICT;

ALTER TABLE document_mark_snapshots
 MODIFY document_context VARCHAR(50) NOT NULL;

CREATE TABLE service_stamp_role_authorizations (
 stamp_id BIGINT UNSIGNED NOT NULL,
 role_id BIGINT UNSIGNED NOT NULL,
 created_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(stamp_id,role_id),
 KEY idx_stamp_role_role(role_id,stamp_id),
 CONSTRAINT fk_stamp_role_stamp FOREIGN KEY(stamp_id) REFERENCES service_stamps(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stamp_role_role FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stamp_role_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE document_mark_policies (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 concession_id BIGINT UNSIGNED NOT NULL,
 agency_id BIGINT UNSIGNED NULL,
 document_type VARCHAR(50) NOT NULL,
 trigger_status VARCHAR(50) NOT NULL,
 signature_required BOOLEAN NOT NULL DEFAULT FALSE,
 stamp_required BOOLEAN NOT NULL DEFAULT FALSE,
 missing_mark_behavior ENUM('BLOCK','ALLOW_WITHOUT_MARK') NOT NULL DEFAULT 'BLOCK',
 default_stamp_id BIGINT UNSIGNED NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 agency_scope_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(agency_id,0)) STORED,
 UNIQUE KEY uq_document_mark_policy(concession_id,agency_scope_key,document_type),
 KEY idx_document_mark_policy_resolution(document_type,concession_id,agency_id,is_active),
 CONSTRAINT fk_document_policy_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_policy_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_policy_default_stamp FOREIGN KEY(default_stamp_id) REFERENCES service_stamps(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_policy_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_document_policy_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE document_mark_snapshots
 ADD COLUMN policy_id BIGINT UNSIGNED NULL AFTER document_context,
 ADD CONSTRAINT fk_document_mark_policy FOREIGN KEY(policy_id) REFERENCES document_mark_policies(id) ON DELETE RESTRICT;
