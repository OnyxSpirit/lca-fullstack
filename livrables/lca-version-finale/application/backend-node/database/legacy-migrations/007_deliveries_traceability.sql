ALTER TABLE deliveries
  ADD COLUMN delivery_specialist_id BIGINT UNSIGNED NULL AFTER agency_id,
  ADD COLUMN delivery_location VARCHAR(255) NULL AFTER scheduled_at,
  ADD COLUMN postponement_reason VARCHAR(500) NULL AFTER customer_notes,
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER postponement_reason,
  ADD COLUMN quality_notes TEXT NULL AFTER cancellation_reason,
  ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER quality_notes,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD INDEX idx_delivery_agency_schedule (agency_id,scheduled_at),
  ADD INDEX idx_delivery_status_schedule (status,scheduled_at),
  ADD INDEX idx_delivery_specialist (delivery_specialist_id),
  ADD CONSTRAINT fk_delivery_specialist FOREIGN KEY (delivery_specialist_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_delivery_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE delivery_documents
  ADD COLUMN file_name VARCHAR(255) NULL AFTER document_url,
  ADD COLUMN mime_type VARCHAR(100) NULL AFTER file_name,
  ADD COLUMN file_size BIGINT UNSIGNED NULL AFTER mime_type,
  ADD COLUMN received_by BIGINT UNSIGNED NULL AFTER received,
  ADD COLUMN received_at DATETIME NULL AFTER received_by,
  ADD CONSTRAINT fk_delivery_document_receiver FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE delivery_signatures
  ADD COLUMN signed_by BIGINT UNSIGNED NULL AFTER signer_name,
  ADD COLUMN consent_text VARCHAR(500) NULL AFTER signature_data,
  ADD COLUMN document_hash CHAR(64) NULL AFTER consent_text,
  ADD CONSTRAINT fk_delivery_signature_user FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE delivery_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL,
  old_status ENUM('planned','preparing','quality_control','ready','delivered','cancelled') NULL,
  new_status ENUM('planned','preparing','quality_control','ready','delivered','cancelled') NOT NULL,
  reason VARCHAR(500) NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_delivery_history (delivery_id,changed_at),
  CONSTRAINT fk_delivery_history_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_checklist_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agency_id BIGINT UNSIGNED NULL,
  item_name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'quality',
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_delivery_template_agency (agency_id,is_active,sort_order),
  CONSTRAINT fk_delivery_template_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO delivery_checklist_templates(agency_id,item_name,category,is_required,sort_order) VALUES
(NULL,'Nettoyage intérieur','preparation',TRUE,10),
(NULL,'Nettoyage extérieur','preparation',TRUE,20),
(NULL,'Contrôle esthétique','quality',TRUE,30),
(NULL,'Contrôle mécanique','quality',TRUE,40),
(NULL,'Documents administratifs complets','documents',TRUE,50),
(NULL,'Accessoires installés','preparation',TRUE,60),
(NULL,'Carburant ou batterie chargé','preparation',TRUE,70),
(NULL,'Double des clés remis','handover',TRUE,80),
(NULL,'Présentation du véhicule au client','handover',TRUE,90),
(NULL,'Validation qualité finale','quality',TRUE,100);
