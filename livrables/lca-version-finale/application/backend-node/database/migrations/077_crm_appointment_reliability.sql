ALTER TABLE leads
  ADD COLUMN lead_type ENUM('individual','company') NULL AFTER priority;

ALTER TABLE activities
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER assigned_user_id,
  ADD CONSTRAINT fk_activities_created_by FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE follow_ups
  ADD COLUMN duration_minutes SMALLINT UNSIGNED NULL AFTER scheduled_at,
  ADD COLUMN conflict_override_reason VARCHAR(1000) NULL AFTER notes,
  ADD COLUMN conflict_override_by BIGINT UNSIGNED NULL AFTER conflict_override_reason,
  ADD COLUMN conflict_override_at DATETIME NULL AFTER conflict_override_by,
  ADD COLUMN conflict_snapshot JSON NULL AFTER conflict_override_at,
  ADD KEY idx_follow_ups_assignee_schedule(assigned_user_id,scheduled_at,status),
  ADD CONSTRAINT fk_follow_ups_conflict_override_by FOREIGN KEY(conflict_override_by) REFERENCES users(id) ON DELETE SET NULL;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('crm','override','crm.appointment.override_conflict','Forcer un rendez-vous en conflit','CRM','Autoriser un chevauchement de rendez-vous avec justification et traçabilité',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code='crm.appointment.override_conflict'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
