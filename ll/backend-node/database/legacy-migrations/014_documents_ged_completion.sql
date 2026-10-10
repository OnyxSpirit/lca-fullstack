ALTER TABLE documents
  ADD COLUMN file_hash CHAR(64) NULL AFTER is_archived,
  ADD COLUMN expires_at DATE NULL AFTER file_hash,
  ADD COLUMN archived_at DATETIME NULL AFTER expires_at,
  ADD COLUMN archived_by BIGINT UNSIGNED NULL AFTER archived_at,
  ADD COLUMN archive_reason VARCHAR(500) NULL AFTER archived_by,
  ADD COLUMN parent_document_id BIGINT UNSIGNED NULL AFTER archive_reason,
  ADD INDEX idx_documents_archive_date (is_archived,created_at),
  ADD INDEX idx_documents_type (document_type),
  ADD INDEX idx_documents_hash_entity (entity_type,entity_id,file_hash),
  ADD INDEX idx_documents_parent (parent_document_id),
  ADD CONSTRAINT fk_documents_archived_by FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_documents_parent FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE SET NULL;
