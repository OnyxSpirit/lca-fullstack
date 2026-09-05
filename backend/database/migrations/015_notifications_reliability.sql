ALTER TABLE notifications
  ADD COLUMN delivery_status ENUM('queued','sent','failed') NOT NULL DEFAULT 'sent' AFTER status,
  ADD COLUMN event_type VARCHAR(100) NULL AFTER reference_id,
  ADD COLUMN priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal' AFTER event_type,
  ADD COLUMN event_key VARCHAR(190) NULL AFTER priority,
  ADD INDEX idx_notifications_user_read_date(user_id,read_at,created_at),
  ADD INDEX idx_notifications_event_type(event_type),
  ADD UNIQUE INDEX uk_notifications_event_key(event_key);
UPDATE notifications SET read_at=COALESCE(read_at,created_at),delivery_status='sent' WHERE status='read';
UPDATE notifications SET delivery_status=CASE WHEN status='failed' THEN 'failed' WHEN status='queued' THEN 'queued' ELSE 'sent' END WHERE status<>'read';
