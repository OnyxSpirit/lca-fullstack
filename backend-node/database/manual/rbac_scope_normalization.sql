-- Opération manuelle, hors runner automatique.
-- Précondition : renseigner @batch_key et charger une matrice approuvée.
-- Une exécution sans ligne approuvée ne modifie aucune attribution.

CREATE TABLE IF NOT EXISTS rbac_scope_normalization_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  batch_key VARCHAR(100) NOT NULL,
  status ENUM('PREPARED','APPLIED','RESTORED') NOT NULL DEFAULT 'PREPARED',
  prepared_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at DATETIME NULL,
  restored_at DATETIME NULL,
  UNIQUE KEY uq_rbac_scope_batch_key (batch_key)
);

CREATE TABLE IF NOT EXISTS rbac_scope_normalization_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  old_scope ENUM('CONCESSION','GLOBAL') NOT NULL,
  proposed_scope ENUM('OWN','AGENCY') NULL,
  decision ENUM('AGENCY','OWN','REMOVE','POLICY_REVIEW') NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at DATETIME NULL,
  restored_at DATETIME NULL,
  UNIQUE KEY uq_rbac_scope_item (batch_id,role_id,permission_id),
  CONSTRAINT fk_rbac_scope_item_batch FOREIGN KEY (batch_id) REFERENCES rbac_scope_normalization_batches(id),
  CONSTRAINT fk_rbac_scope_item_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_rbac_scope_item_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- Inventaire reproductible : il constitue le contrôle avant chargement du plan.
SELECT r.id role_id,r.code role_code,p.id permission_id,p.code permission_code,
       rp.scope old_scope,r.is_system
FROM role_permissions rp
JOIN roles r ON r.id=rp.role_id
JOIN permissions p ON p.id=rp.permission_id
WHERE rp.scope IN ('CONCESSION','GLOBAL')
ORDER BY r.is_system DESC,r.code,p.code;

-- APPLIQUER seulement après validation administrative du plan.
-- SET @batch_key = 'RBAC-NORMALISATION-YYYYMMDD-APPROUVEE';
START TRANSACTION;
UPDATE role_permissions rp
JOIN roles r ON r.id=rp.role_id AND r.is_system=FALSE
JOIN rbac_scope_normalization_batches b ON b.batch_key=@batch_key AND b.status='PREPARED'
JOIN rbac_scope_normalization_items i ON i.batch_id=b.id
 AND i.role_id=rp.role_id AND i.permission_id=rp.permission_id
SET rp.scope=i.proposed_scope,i.applied=TRUE,i.applied_at=NOW()
WHERE i.approved=TRUE AND i.applied=FALSE
  AND i.decision IN ('OWN','AGENCY')
  AND i.proposed_scope=i.decision
  AND rp.scope=i.old_scope;
UPDATE rbac_scope_normalization_batches b
SET b.status='APPLIED',b.applied_at=NOW()
WHERE b.batch_key=@batch_key AND b.status='PREPARED'
  AND EXISTS(SELECT 1 FROM rbac_scope_normalization_items i WHERE i.batch_id=b.id AND i.applied=TRUE);
COMMIT;

-- RESTAURATION contrôlée du même lot (à exécuter séparément si nécessaire).
-- SET @batch_key = 'RBAC-NORMALISATION-YYYYMMDD-APPROUVEE';
START TRANSACTION;
UPDATE role_permissions rp
JOIN roles r ON r.id=rp.role_id AND r.is_system=FALSE
JOIN rbac_scope_normalization_batches b ON b.batch_key=@batch_key AND b.status='APPLIED'
JOIN rbac_scope_normalization_items i ON i.batch_id=b.id
 AND i.role_id=rp.role_id AND i.permission_id=rp.permission_id
SET rp.scope=i.old_scope,i.restored_at=NOW()
WHERE i.applied=TRUE AND i.restored_at IS NULL AND rp.scope=i.proposed_scope;
UPDATE rbac_scope_normalization_batches
SET status='RESTORED',restored_at=NOW()
WHERE batch_key=@batch_key AND status='APPLIED';
COMMIT;
