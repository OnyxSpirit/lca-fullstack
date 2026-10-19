-- LOT B.3.4.8 - Contexte historique immuable des notifications.
-- Les anciennes lignes restent explicitement UNKNOWN, sans backfill spéculatif.
ALTER TABLE notifications
  ADD COLUMN actor_type ENUM('HUMAN','SYSTEM','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN' AFTER event_key,
  ADD COLUMN actor_user_id BIGINT UNSIGNED NULL AFTER actor_type,
  ADD COLUMN actor_display_name_snapshot VARCHAR(201) NULL AFTER actor_user_id,
  ADD COLUMN operation_agency_id BIGINT UNSIGNED NULL AFTER actor_display_name_snapshot,
  ADD COLUMN operation_agency_name_snapshot VARCHAR(150) NULL AFTER operation_agency_id,
  ADD INDEX idx_notifications_actor_user (actor_user_id),
  ADD INDEX idx_notifications_operation_agency (operation_agency_id),
  ADD CONSTRAINT fk_notifications_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_notifications_operation_agency FOREIGN KEY (operation_agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
