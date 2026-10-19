-- B.3.4.2.3 LOT 1 : identité Personnel commune et socle prestataires.
-- Migration additive. Aucun profil prestataire n'est créé par le backfill.

CREATE TABLE personnel_identities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identity_code VARCHAR(50) NOT NULL,
  identity_type ENUM('INDIVIDUAL','COMPANY') NOT NULL,
  concession_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  company_name VARCHAR(200) NULL,
  trade_name VARCHAR(200) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  address VARCHAR(500) NULL,
  administrative_identifier VARCHAR(120) NULL,
  media_path VARCHAR(255) NULL,
  identity_status ENUM('ACTIVE','SUSPENDED','ENDED') NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_personnel_identity_code (identity_code),
  UNIQUE KEY uk_personnel_identity_user (user_id),
  UNIQUE KEY uk_personnel_identity_admin (concession_id,identity_type,administrative_identifier),
  KEY idx_personnel_identity_scope (concession_id,identity_status,identity_type),
  KEY idx_personnel_identity_individual (last_name,first_name),
  KEY idx_personnel_identity_company (company_name),
  CONSTRAINT chk_personnel_identity_shape CHECK (
    (identity_type='INDIVIDUAL' AND first_name IS NOT NULL AND last_name IS NOT NULL AND company_name IS NULL)
    OR
    (identity_type='COMPANY' AND company_name IS NOT NULL AND first_name IS NULL AND last_name IS NULL)
  ),
  CONSTRAINT fk_personnel_identity_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_personnel_identity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_personnel_identity_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_personnel_identity_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE provider_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  personnel_identity_id BIGINT UNSIGNED NOT NULL,
  provider_code VARCHAR(50) NOT NULL,
  service_nature VARCHAR(500) NULL,
  provider_status ENUM('ACTIVE','SUSPENDED','ENDED') NOT NULL DEFAULT 'ACTIVE',
  suspended_at DATETIME NULL,
  suspended_by BIGINT UNSIGNED NULL,
  suspension_reason VARCHAR(1000) NULL,
  ended_at DATETIME NULL,
  ended_by BIGINT UNSIGNED NULL,
  end_reason VARCHAR(1000) NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider_identity (personnel_identity_id),
  UNIQUE KEY uk_provider_code (provider_code),
  KEY idx_provider_status (provider_status,provider_code),
  CONSTRAINT chk_provider_suspension CHECK (
    (provider_status<>'SUSPENDED' AND suspended_at IS NULL AND suspended_by IS NULL AND suspension_reason IS NULL)
    OR
    (provider_status='SUSPENDED' AND suspended_at IS NOT NULL AND suspended_by IS NOT NULL AND suspension_reason IS NOT NULL)
  ),
  CONSTRAINT chk_provider_end CHECK (
    (provider_status<>'ENDED' AND ended_at IS NULL AND ended_by IS NULL AND end_reason IS NULL)
    OR
    (provider_status='ENDED' AND ended_at IS NOT NULL AND ended_by IS NOT NULL AND end_reason IS NOT NULL)
  ),
  CONSTRAINT fk_provider_identity FOREIGN KEY (personnel_identity_id) REFERENCES personnel_identities(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_suspender FOREIGN KEY (suspended_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_provider_ender FOREIGN KEY (ended_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_provider_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE provider_agency_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_profile_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  assignment_status ENUM('ACTIVE','SUSPENDED','ENDED') NOT NULL DEFAULT 'ACTIVE',
  starts_on DATE NOT NULL,
  ends_on DATE NULL,
  suspended_at DATETIME NULL,
  suspended_by BIGINT UNSIGNED NULL,
  suspension_reason VARCHAR(1000) NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider_agency (provider_profile_id,agency_id),
  KEY idx_provider_assignment_agency (agency_id,assignment_status,provider_profile_id),
  CONSTRAINT chk_provider_assignment_dates CHECK (ends_on IS NULL OR ends_on>=starts_on),
  CONSTRAINT chk_provider_assignment_suspension CHECK (
    (assignment_status<>'SUSPENDED' AND suspended_at IS NULL AND suspended_by IS NULL AND suspension_reason IS NULL)
    OR
    (assignment_status='SUSPENDED' AND suspended_at IS NOT NULL AND suspended_by IS NOT NULL AND suspension_reason IS NOT NULL)
  ),
  CONSTRAINT fk_provider_assignment_profile FOREIGN KEY (provider_profile_id) REFERENCES provider_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_assignment_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_assignment_suspender FOREIGN KEY (suspended_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_provider_assignment_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_assignment_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE employee_profiles
  ADD COLUMN personnel_identity_id BIGINT UNSIGNED NULL AFTER id,
  ADD UNIQUE KEY uk_employee_personnel_identity (personnel_identity_id),
  ADD CONSTRAINT fk_employee_personnel_identity FOREIGN KEY (personnel_identity_id) REFERENCES personnel_identities(id) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO personnel_identities(
  identity_code,identity_type,concession_id,user_id,first_name,last_name,email,phone,media_path,identity_status,created_by,updated_by,created_at,updated_at
)
SELECT CONCAT('EMP-',LPAD(ep.id,10,'0')),'INDIVIDUAL',ep.concession_id,ep.user_id,ep.first_name,ep.last_name,ep.email,ep.phone,ep.photo_path,'ACTIVE',ep.created_by,ep.updated_by,ep.created_at,ep.updated_at
FROM employee_profiles ep
LEFT JOIN personnel_identities pi ON pi.identity_code=CONCAT('EMP-',LPAD(ep.id,10,'0'))
WHERE pi.id IS NULL;

UPDATE employee_profiles ep
JOIN personnel_identities pi ON pi.identity_code=CONCAT('EMP-',LPAD(ep.id,10,'0'))
SET ep.personnel_identity_id=pi.id
WHERE ep.personnel_identity_id IS NULL;

SELECT 'employee_without_personnel_identity' migration_conflict_type,COUNT(*) migration_conflict_groups
FROM employee_profiles
WHERE personnel_identity_id IS NULL
HAVING COUNT(*)>0;

SELECT 'employee_identity_mismatch' migration_conflict_type,COUNT(*) migration_conflict_groups
FROM employee_profiles ep
JOIN personnel_identities pi ON pi.id=ep.personnel_identity_id
WHERE pi.identity_type<>'INDIVIDUAL'
   OR pi.concession_id<>ep.concession_id
   OR NOT (pi.first_name<=>ep.first_name)
   OR NOT (pi.last_name<=>ep.last_name)
   OR NOT (pi.user_id<=>ep.user_id)
HAVING COUNT(*)>0;

SELECT 'artificial_provider_profile' migration_conflict_type,COUNT(*) migration_conflict_groups
FROM provider_profiles
HAVING COUNT(*)>0;
