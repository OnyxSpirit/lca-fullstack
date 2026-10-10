-- Permissions dynamiques propres à Clients 360°.
INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('customers','create','customers.create','Créer un client','Clients 360°','Créer une fiche client',TRUE),
('customers','update','customers.update','Modifier un client','Clients 360°','Modifier une fiche et ses contacts',TRUE),
('customers','assign','customers.assign','Affecter un client','Clients 360°','Changer le commercial responsable',TRUE),
('customers','view','customers.history.view','Voir l’historique client','Clients 360°','Consulter la timeline de la fiche',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN('customers.create','customers.update','customers.assign','customers.history.view')
WHERE r.code='SUPER_ADMIN' ON DUPLICATE KEY UPDATE scope=VALUES(scope);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'CONCESSION' FROM roles r JOIN permissions p ON p.code IN('customers.create','customers.update','customers.assign','customers.history.view')
WHERE r.code='DIRECTOR' ON DUPLICATE KEY UPDATE scope=VALUES(scope);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code IN('customers.create','customers.update','customers.assign','customers.history.view')
WHERE r.code IN('SALES_MANAGER','RECEPTIONIST','SERVICE_MANAGER','SERVICE_ADVISOR') ON DUPLICATE KEY UPDATE scope=VALUES(scope);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'OWN' FROM roles r JOIN permissions p ON p.code IN('customers.create','customers.update','customers.history.view')
WHERE r.code='SALES_AGENT' ON DUPLICATE KEY UPDATE scope=VALUES(scope);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'OWN' FROM roles r JOIN permissions p ON p.code='customers.assign'
WHERE r.code='SALES_AGENT' ON DUPLICATE KEY UPDATE scope=VALUES(scope);
