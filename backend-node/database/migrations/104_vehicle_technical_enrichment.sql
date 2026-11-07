ALTER TABLE commercial_models
  ADD COLUMN technical_category VARCHAR(120) NULL AFTER vehicle_type,
  ADD COLUMN technical_body_type VARCHAR(120) NULL AFTER configuration,
  ADD COLUMN displacement_cc INT UNSIGNED NULL AFTER engine_power,
  ADD COLUMN cylinder_count SMALLINT UNSIGNED NULL AFTER displacement_cc,
  ADD COLUMN powertrain_type VARCHAR(120) NULL AFTER cylinder_count,
  ADD COLUMN fuel_tank_capacity_l DECIMAL(8,2) NULL AFTER combined_range_km,
  ADD COLUMN fuel_consumption_l_100km DECIMAL(8,2) NULL AFTER fuel_tank_capacity_l,
  ADD COLUMN maximum_speed_kmh DECIMAL(8,2) NULL AFTER acceleration_0_100_seconds,
  ADD COLUMN gear_count SMALLINT UNSIGNED NULL AFTER drive_method,
  ADD COLUMN driving_configuration VARCHAR(190) NULL AFTER gear_count,
  ADD COLUMN interior_trim VARCHAR(190) NULL AFTER seat_count,
  ADD COLUMN tire_dimensions VARCHAR(120) NULL AFTER interior_trim,
  ADD COLUMN front_suspension VARCHAR(190) NULL AFTER battery_cooling_function,
  ADD COLUMN front_brakes VARCHAR(190) NULL AFTER rear_suspension,
  ADD COLUMN rear_brakes VARCHAR(190) NULL AFTER front_brakes,
  ADD COLUMN safety_features TEXT NULL AFTER steering_system,
  ADD COLUMN embedded_technologies TEXT NULL AFTER central_screen_dashboard,
  ADD COLUMN connectivity TEXT NULL AFTER embedded_technologies,
  ADD COLUMN multimedia_system TEXT NULL AFTER connectivity,
  ADD COLUMN other_technologies TEXT NULL AFTER multimedia_system,
  ADD COLUMN warranty_duration_months SMALLINT UNSIGNED NULL AFTER warranty_text,
  ADD COLUMN warranty_mileage_limit_km INT UNSIGNED NULL AFTER warranty_duration_months,
  ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 1 AFTER is_commercially_available,
  ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
  ADD CONSTRAINT fk_commercial_model_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE vehicles
  ADD COLUMN technical_overrides JSON NULL AFTER notes,
  ADD COLUMN technical_snapshot JSON NULL AFTER technical_overrides,
  ADD COLUMN technical_frozen_at DATETIME NULL AFTER technical_snapshot;

