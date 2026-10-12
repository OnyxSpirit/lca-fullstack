-- Migration sûre Utilisateurs & RBAC.
-- Étape 1 : lister les comptes qui nécessitent une affectation métier explicite.
SELECT id,first_name,last_name,email FROM users WHERE agency_id IS NULL;

ALTER TABLE users ADD COLUMN avatar_path VARCHAR(500) NULL AFTER job_title;

-- Cette garde interrompt volontairement la migration si une agence ne peut pas
-- être déterminée sans ambiguïté. Affecter manuellement ces comptes puis rejouer.
DELIMITER $$
CREATE PROCEDURE ensure_users_have_agency()
BEGIN
  IF EXISTS(SELECT 1 FROM users WHERE agency_id IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='USERS_WITHOUT_AGENCY: affectation manuelle requise avant NOT NULL';
  END IF;
END$$
DELIMITER ;
CALL ensure_users_have_agency();
DROP PROCEDURE ensure_users_have_agency;

ALTER TABLE users
  MODIFY agency_id BIGINT UNSIGNED NOT NULL,
  DROP FOREIGN KEY fk_user_agency,
  ADD CONSTRAINT fk_user_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- users.email est déjà UNIQUE et user_roles possède déjà sa PK composite.
CREATE INDEX idx_users_agency_active ON users(agency_id,is_active);
