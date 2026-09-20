ALTER TABLE documents
  ADD COLUMN origin ENUM('manual','generated') NOT NULL DEFAULT 'manual' AFTER uploaded_by,
  ADD COLUMN source_key VARCHAR(190) NULL AFTER origin,
  ADD UNIQUE INDEX uk_documents_source_key (source_key);
