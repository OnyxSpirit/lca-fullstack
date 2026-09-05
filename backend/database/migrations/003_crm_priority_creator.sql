ALTER TABLE leads
  ADD COLUMN priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium' AFTER status,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER assigned_user_id,
  ADD INDEX idx_lead_priority (priority),
  ADD INDEX idx_lead_created_by (created_by),
  ADD CONSTRAINT fk_lead_creator FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Les lignes historiques sont attribuées à leur responsable actuel lorsque celui-ci existe.
UPDATE leads SET created_by=assigned_user_id WHERE created_by IS NULL;
