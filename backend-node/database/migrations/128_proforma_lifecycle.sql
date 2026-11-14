-- Cycle de vie complet des factures pro forma, sans altération des archives émises.

ALTER TABLE proformas
  MODIFY COLUMN status ENUM('draft','issued','expired','cancelled') NOT NULL DEFAULT 'draft',
  ADD COLUMN cancelled_at DATETIME NULL AFTER issued_at,
  ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER cancelled_at,
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER cancelled_by,
  ADD COLUMN supersedes_proforma_id BIGINT UNSIGNED NULL AFTER cancellation_reason,
  ADD KEY idx_proformas_expiration (status,valid_until),
  ADD KEY idx_proformas_supersedes (supersedes_proforma_id),
  ADD CONSTRAINT fk_proforma_cancelled_by FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_proforma_supersedes FOREIGN KEY(supersedes_proforma_id) REFERENCES proformas(id) ON DELETE RESTRICT;

CREATE TABLE proforma_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proforma_id BIGINT UNSIGNED NOT NULL,
  old_status ENUM('draft','issued','expired','cancelled') NULL,
  new_status ENUM('draft','issued','expired','cancelled') NOT NULL,
  reason VARCHAR(500) NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proforma_history_transition (proforma_id,new_status),
  KEY idx_proforma_history (proforma_id,changed_at,id),
  CONSTRAINT fk_proforma_history_proforma FOREIGN KEY(proforma_id) REFERENCES proformas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_proforma_history_user FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active)
VALUES('proformas','cancel','proformas.cancel','Annuler une facture pro forma','Annuler une facture pro forma','Documents commerciaux','Annuler avec motif une facture pro forma émise ou en brouillon',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL'
FROM roles r JOIN permissions p ON p.code='proformas.cancel'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
ON DUPLICATE KEY UPDATE scope=role_permissions.scope;
