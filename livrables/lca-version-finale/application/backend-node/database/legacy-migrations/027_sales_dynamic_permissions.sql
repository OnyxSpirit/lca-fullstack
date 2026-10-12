-- Permissions dynamiques du workflow commercial Ventes.
INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('sales','cancel','sales.cancel','Annuler une vente','Ventes','Annuler une vente sans paiement ni livraison engagée',TRUE),
('sales','assign','sales.assign','Affecter une vente','Ventes','Choisir ou modifier le commercial propriétaire',TRUE),
('sales','update','sales.discount.manage','Gérer les remises','Ventes','Accorder une remise commerciale lors de la création',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code LIKE 'sales.%' WHERE r.code='SUPER_ADMIN'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'CONCESSION' FROM roles r JOIN permissions p ON p.code IN('sales.confirm','sales.cancel','sales.assign','sales.discount.manage') WHERE r.code='DIRECTOR'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code IN('sales.confirm','sales.cancel','sales.assign','sales.discount.manage') WHERE r.code='SALES_MANAGER'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'OWN' FROM roles r JOIN permissions p ON p.code='sales.confirm' WHERE r.code IN('SALES_AGENT','SALES_REP')
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
