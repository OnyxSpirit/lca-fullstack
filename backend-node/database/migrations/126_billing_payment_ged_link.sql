-- Liaison GED additive des justificatifs externes de règlement.
ALTER TABLE payments
  ADD COLUMN attachment_document_id BIGINT UNSIGNED NULL AFTER treasury_account_id,
  ADD UNIQUE KEY uq_payment_attachment_document(attachment_document_id),
  ADD CONSTRAINT fk_payment_attachment_document FOREIGN KEY(attachment_document_id) REFERENCES documents(id) ON DELETE RESTRICT;

INSERT INTO document_categories(code,name,display_order,is_active)
VALUES('FINANCIAL_SUPPORTING','Justificatifs financiers',45,TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),is_active=TRUE;

INSERT INTO document_types(category_id,code,name,display_order,is_active)
SELECT id,'PAYMENT_SUPPORTING','Justificatif externe de règlement',10,TRUE
FROM document_categories WHERE code='FINANCIAL_SUPPORTING'
ON DUPLICATE KEY UPDATE name=VALUES(name),is_active=TRUE;
