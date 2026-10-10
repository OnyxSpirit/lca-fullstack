CREATE TABLE delivery_financial_authorizations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  concession_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) NOT NULL,
  balance_due_snapshot DECIMAL(15,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  guarantee_type VARCHAR(100) NULL,
  guarantee_details TEXT NULL,
  guarantee_reference VARCHAR(150) NULL,
  balance_due_date DATE NULL,
  payment_terms VARCHAR(1000) NULL,
  status ENUM('AUTHORIZED','REVOKED','SUPERSEDED','USED') NOT NULL DEFAULT 'AUTHORIZED',
  client_request_id CHAR(36) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  authorized_by BIGINT UNSIGNED NOT NULL,
  authorized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by BIGINT UNSIGNED NULL,
  revoked_at DATETIME NULL,
  revocation_reason VARCHAR(1000) NULL,
  used_by BIGINT UNSIGNED NULL,
  used_at DATETIME NULL,
  used_delivery_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_fin_auth_request (created_by,client_request_id),
  KEY idx_delivery_fin_auth_sale_status (sale_id,status,id),
  KEY idx_delivery_fin_auth_invoice (invoice_id,id),
  KEY idx_delivery_fin_auth_scope (concession_id,agency_id,id),
  CONSTRAINT chk_delivery_fin_auth_snapshot CHECK (total_amount >= 0 AND paid_amount >= 0 AND balance_due_snapshot > 0),
  CONSTRAINT fk_delivery_fin_auth_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_authorizer FOREIGN KEY (authorized_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_revoker FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_user FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_delivery FOREIGN KEY (used_delivery_id) REFERENCES deliveries(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('delivery','authorize','delivery.financial_override.authorize','Autoriser une livraison avec solde','Livraisons','Autoriser ou révoquer une dérogation financière de livraison',TRUE);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code='delivery.financial_override.authorize'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE;
