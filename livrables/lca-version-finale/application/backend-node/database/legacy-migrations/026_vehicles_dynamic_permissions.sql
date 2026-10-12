-- Catalogue RBAC dynamique du stock véhicules VN/VO.
INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('vehicles','create','vehicles.create','Créer un véhicule','Véhicules','Créer une entrée de stock',TRUE),
('vehicles','update','vehicles.update','Modifier un véhicule','Véhicules','Modifier les caractéristiques du véhicule',TRUE),
('vehicles','update','vehicles.status.update','Changer le statut véhicule','Véhicules','Effectuer une transition manuelle autorisée',TRUE),
('vehicles','update','vehicles.images.manage','Gérer les images véhicule','Véhicules','Ajouter, ordonner ou supprimer les photos',TRUE),
('vehicles','assign','vehicles.assign_agency','Transférer un véhicule','Véhicules','Changer l’agence ou l’emplacement du véhicule',TRUE),
('vehicles','delete','vehicles.archive','Archiver un véhicule','Véhicules','Retirer sans suppression physique un véhicule du catalogue',TRUE),
('vehicles','view','vehicles.financials.view','Voir les coûts véhicule','Véhicules','Consulter coûts, marge et historique tarifaire',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code LIKE 'vehicles.%' WHERE r.code='SUPER_ADMIN'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'CONCESSION' FROM roles r JOIN permissions p ON p.code IN('vehicles.create','vehicles.update','vehicles.status.update','vehicles.images.manage','vehicles.assign_agency','vehicles.archive','vehicles.financials.view') WHERE r.code='DIRECTOR'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code IN('vehicles.create','vehicles.update','vehicles.status.update','vehicles.images.manage','vehicles.archive','vehicles.financials.view') WHERE r.code='SALES_MANAGER'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code IN('vehicles.create','vehicles.update','vehicles.status.update','vehicles.images.manage','vehicles.assign_agency','vehicles.archive') WHERE r.code='WAREHOUSE_CLERK'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code='vehicles.status.update' WHERE r.code='SERVICE_MANAGER'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
