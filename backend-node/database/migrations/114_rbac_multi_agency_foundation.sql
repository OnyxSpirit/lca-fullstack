-- Phase 1 RBAC multi-agences : modèle additif, sans changement du moteur courant.
CREATE TABLE user_agencies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT UNSIGNED NULL,
  deactivated_by BIGINT UNSIGNED NULL,
  deactivated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  active_primary_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN is_primary=TRUE AND status='ACTIVE' THEN user_id ELSE NULL END
  ) STORED,
  UNIQUE KEY uq_user_agency (user_id,agency_id),
  UNIQUE KEY uq_user_active_primary_agency (active_primary_user_id),
  KEY idx_user_agencies_agency_status (agency_id,status,user_id),
  CONSTRAINT chk_user_agency_primary_active CHECK (is_primary=FALSE OR status='ACTIVE'),
  CONSTRAINT chk_user_agency_deactivation CHECK (
    (status='ACTIVE' AND deactivated_at IS NULL)
    OR status='INACTIVE'
  ),
  CONSTRAINT fk_user_agency_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_agency_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_agency_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_agency_deactivator FOREIGN KEY (deactivated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE user_agency_roles (
  user_agency_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_agency_id,role_id),
  KEY idx_user_agency_roles_role (role_id,user_agency_id),
  CONSTRAINT fk_user_agency_role_assignment FOREIGN KEY (user_agency_id) REFERENCES user_agencies(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_agency_role_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_agency_role_assigner FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Reprise déterministe : l'agence historique valide devient l'agence principale.
INSERT INTO user_agencies(user_id,agency_id,is_primary,status)
SELECT u.id,u.agency_id,TRUE,'ACTIVE'
FROM users u
JOIN agencies a ON a.id=u.agency_id
WHERE u.agency_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  is_primary=VALUES(is_primary),status='ACTIVE',deactivated_by=NULL,deactivated_at=NULL;

-- Les rôles système restent centraux : aucune duplication artificielle par agence.
INSERT INTO user_agency_roles(user_agency_id,role_id)
SELECT ua.id,ur.role_id
FROM user_agencies ua
JOIN user_roles ur ON ur.user_id=ua.user_id
JOIN roles r ON r.id=ur.role_id
WHERE ua.is_primary=TRUE AND ua.status='ACTIVE' AND r.is_system=FALSE
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);
