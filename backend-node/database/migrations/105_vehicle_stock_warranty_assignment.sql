ALTER TABLE vehicles
  ADD COLUMN warranty_provider_id BIGINT UNSIGNED NULL AFTER technical_frozen_at,
  ADD COLUMN warranty_provider_code_snapshot VARCHAR(50) NULL AFTER warranty_provider_id,
  ADD COLUMN warranty_provider_name_snapshot VARCHAR(200) NULL AFTER warranty_provider_code_snapshot,
  ADD COLUMN warranty_duration_months_snapshot SMALLINT UNSIGNED NULL AFTER warranty_provider_name_snapshot,
  ADD COLUMN warranty_mileage_limit_snapshot INT UNSIGNED NULL AFTER warranty_duration_months_snapshot,
  ADD COLUMN warranty_terms_snapshot TEXT NULL AFTER warranty_mileage_limit_snapshot,
  ADD COLUMN warranty_assigned_at DATETIME NULL AFTER warranty_terms_snapshot,
  ADD COLUMN warranty_assigned_by BIGINT UNSIGNED NULL AFTER warranty_assigned_at,
  ADD INDEX idx_vehicle_warranty_provider(warranty_provider_id),
  ADD CONSTRAINT chk_vehicle_warranty_months CHECK(warranty_duration_months_snapshot IS NULL OR warranty_duration_months_snapshot BETWEEN 1 AND 240),
  ADD CONSTRAINT chk_vehicle_warranty_mileage CHECK(warranty_mileage_limit_snapshot IS NULL OR warranty_mileage_limit_snapshot>0),
  ADD CONSTRAINT fk_vehicle_warranty_provider FOREIGN KEY(warranty_provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_vehicle_warranty_actor FOREIGN KEY(warranty_assigned_by) REFERENCES users(id) ON DELETE SET NULL;

