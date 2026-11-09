-- SAV : main-d'oeuvre forfaitaire explicite et snapshot fiscal de l'OR.
ALTER TABLE repair_orders
  ADD COLUMN tax_mode ENUM('TAXABLE','TAX_EXEMPT') NOT NULL DEFAULT 'TAXABLE' AFTER actual_total,
  ADD COLUMN tax_rate_snapshot DECIMAL(8,4) NULL AFTER tax_mode,
  ADD COLUMN tax_justification VARCHAR(1000) NULL AFTER tax_rate_snapshot,
  ADD COLUMN tax_selected_by BIGINT UNSIGNED NULL AFTER tax_justification,
  ADD COLUMN tax_selected_at DATETIME NULL AFTER tax_selected_by,
  ADD CONSTRAINT fk_repair_order_tax_selector FOREIGN KEY(tax_selected_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT chk_repair_order_tax_choice CHECK(
    (tax_mode='TAXABLE' AND tax_justification IS NULL) OR
    (tax_mode='TAX_EXEMPT' AND tax_justification IS NOT NULL AND CHAR_LENGTH(TRIM(tax_justification))>0)
  );

ALTER TABLE repair_order_estimate_items
  MODIFY item_type ENUM('part','labor','labor_flat') NOT NULL;

ALTER TABLE repair_order_items
  MODIFY item_type ENUM('part','labor','labor_flat','accessory','other') NOT NULL;

ALTER TABLE repair_estimate_supplement_items
  DROP CHECK repair_estimate_supplement_items_chk_2,
  MODIFY item_type ENUM('labor','labor_flat','part') NOT NULL,
  ADD CONSTRAINT chk_repair_supplement_item_reference CHECK(
    (item_type='part' AND part_id IS NOT NULL AND labor_rate_id IS NULL) OR
    (item_type='labor' AND part_id IS NULL AND labor_rate_id IS NOT NULL) OR
    (item_type='labor_flat' AND part_id IS NULL AND labor_rate_id IS NULL)
  );

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('service','update','service.tax.override','Dérogation fiscale SAV','SAV / Atelier','Sélectionner un régime sans TVA avec justification sur un ordre de réparation',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code='service.tax.override'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;

INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description)
VALUES('global',0,'workshop.allow_flat_labor','true','Autoriser la main-d oeuvre forfaitaire supplémentaire dans le SAV')
ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
