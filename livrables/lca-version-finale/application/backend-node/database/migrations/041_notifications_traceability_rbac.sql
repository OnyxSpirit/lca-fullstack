-- Sépare consultation, lecture, archivage et suppression logique des notifications.
ALTER TABLE notifications
    ADD COLUMN archived_at DATETIME NULL AFTER read_at,
    ADD COLUMN archived_by BIGINT UNSIGNED NULL AFTER archived_at,
    ADD COLUMN deleted_at DATETIME NULL AFTER archived_by,
    ADD COLUMN deleted_by BIGINT UNSIGNED NULL AFTER deleted_at,
    ADD INDEX idx_notifications_user_visible (user_id,channel,deleted_at,archived_at,read_at,created_at),
    ADD INDEX idx_notifications_archived_by (archived_by),
    ADD INDEX idx_notifications_deleted_by (deleted_by),
    ADD CONSTRAINT fk_notification_archived_by FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_notification_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('notifications','update','notifications.update','Mettre à jour les notifications','Général','Marquer ses notifications comme lues',TRUE),
('notifications','archive','notifications.archive','Archiver les notifications','Général','Retirer ses notifications de la liste active',TRUE),
('notifications','delete','notifications.delete','Supprimer logiquement les notifications','Général','Supprimer logiquement ses notifications avec traçabilité',TRUE);
