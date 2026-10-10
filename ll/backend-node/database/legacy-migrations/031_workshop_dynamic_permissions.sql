-- Capacités Atelier manquantes et traçabilité du temps. Migration additive/idempotente.
INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('workshop','update','workshop.plan','Planifier l’atelier','Atelier','Créer et modifier le planning atelier',TRUE),
('workshop','assign','workshop.assign_technician','Affecter un technicien','Atelier','Affecter ou réaffecter un technicien',TRUE),
('workshop','assign','workshop.assign_bay','Affecter un pont','Atelier','Affecter un pont ou une baie à un créneau',TRUE),
('workshop','view','workshop.bay.view','Voir les ponts','Atelier','Consulter les ponts et baies',TRUE),
('workshop','manage','workshop.bay.manage','Gérer les ponts','Atelier','Configurer le statut et la capacité des ponts',TRUE),
('workshop','manage','workshop.session.manage','Superviser les sessions atelier','Atelier','Superviser les sessions techniques dans son périmètre',TRUE),
('workshop','view','workshop.time.view','Voir les temps atelier','Atelier','Consulter les temps techniques dans son périmètre',TRUE),
('workshop','adjust','workshop.time.adjust','Corriger les temps atelier','Atelier','Corriger un temps avec motif et historique',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

ALTER TABLE work_sessions
  ADD COLUMN IF NOT EXISTS paused_at DATETIME NULL AFTER started_at,
  ADD COLUMN IF NOT EXISTS accumulated_pause_seconds INT UNSIGNED NOT NULL DEFAULT 0 AFTER paused_at;

CREATE TABLE IF NOT EXISTS workshop_session_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  action ENUM('started','paused','resumed','stopped','adjusted') NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  reason VARCHAR(500) NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_workshop_session_history(session_id,changed_at),
  CONSTRAINT fk_workshop_session_history_session FOREIGN KEY(session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_workshop_session_history_user FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
