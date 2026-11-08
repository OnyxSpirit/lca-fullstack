CREATE TABLE part_sales (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,sale_number VARCHAR(80) NOT NULL,customer_id BIGINT UNSIGNED NOT NULL,agency_id BIGINT UNSIGNED NOT NULL,invoice_id BIGINT UNSIGNED NULL,
 status ENUM('INVOICED','PARTIALLY_RELEASED','RELEASED','CANCELLED') NOT NULL DEFAULT 'INVOICED',currency_code CHAR(3) NOT NULL,total DECIMAL(18,2) NOT NULL,
 idempotency_key VARCHAR(64) NOT NULL,created_by BIGINT UNSIGNED NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,released_by BIGINT UNSIGNED NULL,released_at DATETIME NULL,
 UNIQUE KEY uq_part_sale_number(sale_number),UNIQUE KEY uq_part_sale_request(created_by,idempotency_key),UNIQUE KEY uq_part_sale_invoice(invoice_id),KEY idx_part_sale_agency_status(agency_id,status,created_at),
 FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,FOREIGN KEY(released_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE part_sale_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,part_sale_id BIGINT UNSIGNED NOT NULL,part_id BIGINT UNSIGNED NOT NULL,part_stock_id BIGINT UNSIGNED NOT NULL,quantity DECIMAL(12,2) NOT NULL,quantity_released DECIMAL(12,2) NOT NULL DEFAULT 0,
 unit_price DECIMAL(18,2) NOT NULL,tax_rate DECIMAL(8,4) NOT NULL,line_total DECIMAL(18,2) NOT NULL,UNIQUE KEY uq_part_sale_part_stock(part_sale_id,part_id,part_stock_id),
 CHECK(quantity>0 AND quantity_released>=0 AND quantity_released<=quantity),FOREIGN KEY(part_sale_id) REFERENCES part_sales(id) ON DELETE CASCADE,FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE RESTRICT,FOREIGN KEY(part_stock_id) REFERENCES part_stocks(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE part_sale_returns (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,return_number VARCHAR(80) NOT NULL,part_sale_item_id BIGINT UNSIGNED NOT NULL,quantity DECIMAL(12,2) NOT NULL,condition_code ENUM('GOOD','DAMAGED','DEFECTIVE','UNUSABLE') NOT NULL,
 decision ENUM('PENDING','RESTOCKED','QUARANTINED','SUPPLIER_RETURN','SCRAPPED','EXCHANGED') NOT NULL DEFAULT 'PENDING',financial_decision ENUM('NONE','CREDIT','REFUND','PARTIAL_REFUND','EXCHANGE') NOT NULL DEFAULT 'NONE',financial_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
 reason VARCHAR(500) NOT NULL,idempotency_key VARCHAR(64) NOT NULL,created_by BIGINT UNSIGNED NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,decided_by BIGINT UNSIGNED NULL,decided_at DATETIME NULL,
 UNIQUE KEY uq_part_sale_return_number(return_number),UNIQUE KEY uq_part_sale_return_request(part_sale_item_id,idempotency_key),CHECK(quantity>0 AND financial_amount>=0),FOREIGN KEY(part_sale_item_id) REFERENCES part_sale_items(id) ON DELETE RESTRICT,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('parts','view','parts.sale.view','Voir les ventes de pièces','Pièces & stock','Consulter les ventes comptoir',TRUE),
('parts','create','parts.sale.create','Créer une vente de pièces','Pièces & stock','Réserver et facturer une vente comptoir',TRUE),
('parts','update','parts.sale.release','Remettre une vente de pièces','Pièces & stock','Confirmer la remise physique et sortir le stock',TRUE),
('parts','create','parts.sale.return','Enregistrer un retour de vente pièces','Pièces & stock','Réceptionner et instruire un retour client',TRUE),
('parts','update','parts.sale.return_decide','Décider un retour de vente pièces','Pièces & stock','Décider le stock et la régularisation financière',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN('parts.sale.view','parts.sale.create','parts.sale.release','parts.sale.return','parts.sale.return_decide') WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
