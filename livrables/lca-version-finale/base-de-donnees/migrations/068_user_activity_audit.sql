ALTER TABLE audit_logs
  ADD COLUMN agency_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD COLUMN concession_id BIGINT UNSIGNED NULL AFTER agency_id,
  DROP INDEX idx_audit_user_date,
  ADD INDEX idx_audit_user_date (user_id,created_at,id),
  ADD INDEX idx_audit_created (created_at,id),
  ADD INDEX idx_audit_agency_date (agency_id,created_at,id),
  ADD INDEX idx_audit_concession_date (concession_id,created_at,id),
  ADD INDEX idx_audit_module_date (module,created_at,id),
  ADD CONSTRAINT fk_audit_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_audit_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE SET NULL;
INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('activity','view','activity.view','Voir l’activité utilisateurs','Système & Concession','Consulter les événements opérationnels audités dans son périmètre',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=TRUE;
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code='activity.view'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE
ON DUPLICATE KEY UPDATE scope='GLOBAL';
