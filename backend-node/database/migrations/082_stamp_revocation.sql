ALTER TABLE service_stamps
 ADD COLUMN revoked_by BIGINT UNSIGNED NULL AFTER updated_by,
 ADD COLUMN revoked_at DATETIME NULL AFTER revoked_by,
 ADD COLUMN revocation_reason VARCHAR(500) NULL AFTER revoked_at,
 ADD KEY idx_service_stamp_revocation(revoked_at,concession_id,agency_id),
 ADD CONSTRAINT chk_service_stamp_revocation CHECK(
   (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
   OR
   (is_active=FALSE AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revocation_reason IS NOT NULL)
 ),
 ADD CONSTRAINT fk_service_stamp_revoker FOREIGN KEY(revoked_by) REFERENCES users(id) ON DELETE RESTRICT;
