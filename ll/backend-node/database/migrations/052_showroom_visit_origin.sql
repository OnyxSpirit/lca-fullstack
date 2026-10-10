ALTER TABLE showroom_visits
  ADD COLUMN origin ENUM('showroom','crm') NOT NULL DEFAULT 'showroom' AFTER lead_id,
  MODIFY COLUMN outcome ENUM('pending','lead_created','quotation','sale','no_interest','follow_up','crm_test_drive') NOT NULL DEFAULT 'pending',
  ADD INDEX idx_showroom_origin_status (origin,status);
