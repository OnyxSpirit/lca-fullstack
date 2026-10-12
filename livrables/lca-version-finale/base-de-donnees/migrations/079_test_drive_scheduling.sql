ALTER TABLE showroom_test_drives
  ADD COLUMN scheduled_at DATETIME NULL AFTER status,
  ADD COLUMN duration_minutes SMALLINT UNSIGNED NULL AFTER scheduled_at,
  ADD KEY idx_test_drive_vehicle_schedule(vehicle_id,status,scheduled_at),
  ADD KEY idx_test_drive_advisor_schedule(advisor_id,status,scheduled_at);

