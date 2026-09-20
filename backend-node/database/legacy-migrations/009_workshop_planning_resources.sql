ALTER TABLE technicians
  ADD INDEX idx_technicians_agency_active (agency_id, is_active);

ALTER TABLE workshop_bays
  ADD COLUMN capacity SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER bay_type,
  ADD UNIQUE KEY uk_workshop_bay_agency_name (agency_id, name),
  ADD INDEX idx_workshop_bay_agency_status (agency_id, status);

ALTER TABLE schedules
  ADD COLUMN intervention_id BIGINT UNSIGNED NULL AFTER repair_order_id,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER notes,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
  ADD INDEX idx_schedule_agency_range (agency_id, starts_at, ends_at),
  ADD INDEX idx_schedule_technician_range (technician_id, starts_at, ends_at),
  ADD INDEX idx_schedule_bay_range (bay_id, starts_at, ends_at),
  ADD CONSTRAINT fk_schedule_intervention FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_schedule_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT chk_schedule_range CHECK (ends_at > starts_at);

ALTER TABLE work_sessions
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_by,
  ADD INDEX idx_work_session_technician_status (technician_id, status),
  ADD INDEX idx_work_session_bay_status (bay_id, status),
  ADD CONSTRAINT fk_ws_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE time_entries
  ADD COLUMN work_session_id BIGINT UNSIGNED NULL AFTER intervention_id,
  ADD UNIQUE KEY uk_time_entry_session (work_session_id),
  ADD INDEX idx_time_entry_technician_date (technician_id, entry_date),
  ADD CONSTRAINT fk_time_session FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE SET NULL;

CREATE TABLE workshop_schedule_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  schedule_id BIGINT UNSIGNED NOT NULL,
  action ENUM('created','updated','cancelled') NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_schedule_history (schedule_id, changed_at),
  CONSTRAINT fk_schedule_history_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_schedule_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE technician_unavailabilities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  technician_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  reason VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_technician_unavailability_range (technician_id, starts_at, ends_at),
  CONSTRAINT chk_unavailability_range CHECK (ends_at > starts_at),
  CONSTRAINT fk_unavailability_technician FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  CONSTRAINT fk_unavailability_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
