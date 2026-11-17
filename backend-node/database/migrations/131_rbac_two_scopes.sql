-- Décision métier définitive : les scopes RBAC persistés sont OWN et AGENCY.
-- La réduction CONCESSION/GLOBAL -> AGENCY ne peut jamais élargir un droit.
-- Le Super Administrateur reste identifié par roles.is_system + code, et doit
-- sélectionner une agence active pour toute opération portant sur ses données.

CREATE TABLE rbac_scope_migration_history (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  previous_scope VARCHAR(20) NULL,
  decision ENUM('REDUCED_TO_AGENCY','QUARANTINED_AMBIGUOUS') NOT NULL,
  migrated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id,permission_id),
  CONSTRAINT fk_rbac_scope_history_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rbac_scope_history_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO rbac_scope_migration_history(role_id,permission_id,previous_scope,decision)
SELECT role_id,permission_id,scope,
       IF(scope IS NULL,'QUARANTINED_AMBIGUOUS','REDUCED_TO_AGENCY')
FROM role_permissions
WHERE scope IS NULL OR scope IN ('CONCESSION','GLOBAL');

-- Un scope large devient strictement plus restrictif. Les attributions sans
-- sémantique explicite sont retirées de l'autorité active, jamais devinées.
UPDATE role_permissions SET scope='AGENCY' WHERE scope IN ('CONCESSION','GLOBAL');
DELETE FROM role_permissions WHERE scope IS NULL;

ALTER TABLE role_permissions
  MODIFY scope ENUM('OWN','AGENCY') NOT NULL;
