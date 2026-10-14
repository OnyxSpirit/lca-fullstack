ALTER TABLE audit_logs
 ADD COLUMN context_mode ENUM('LEGACY','GLOBAL','RESOURCE','EXPLICIT','UNKNOWN') NOT NULL DEFAULT 'LEGACY' AFTER concession_id,
 ADD COLUMN context_note VARCHAR(255) NULL AFTER context_mode,
 ADD KEY idx_audit_context_mode_date(context_mode,created_at,id);
