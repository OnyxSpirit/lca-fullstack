ALTER TABLE refresh_tokens
  ADD COLUMN active_agency_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD COLUMN agency_context_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER active_agency_id,
  ADD KEY idx_refresh_active_agency (active_agency_id,user_id),
  ADD CONSTRAINT fk_refresh_active_agency FOREIGN KEY (active_agency_id) REFERENCES agencies(id) ON DELETE SET NULL;

UPDATE refresh_tokens rt
JOIN user_agencies ua ON ua.user_id=rt.user_id AND ua.is_primary=TRUE AND ua.status='ACTIVE'
SET rt.active_agency_id=ua.agency_id
WHERE rt.revoked_at IS NULL AND rt.active_agency_id IS NULL;
