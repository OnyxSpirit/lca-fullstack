CREATE TABLE service_stamp_document_types (
 stamp_id BIGINT UNSIGNED NOT NULL,
 document_type VARCHAR(50) NOT NULL,
 created_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(stamp_id,document_type),
 KEY idx_stamp_document_type(document_type,stamp_id),
 CONSTRAINT fk_stamp_document_type_stamp FOREIGN KEY(stamp_id) REFERENCES service_stamps(id) ON DELETE RESTRICT,
 CONSTRAINT fk_stamp_document_type_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO service_stamp_document_types(stamp_id,document_type,created_by)
SELECT id,document_context,created_by FROM service_stamps;
