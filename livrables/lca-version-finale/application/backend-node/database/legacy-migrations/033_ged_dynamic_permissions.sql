INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('documents','create','ged.upload','Déposer un document GED','GED','Ajouter une pièce à un dossier métier',TRUE),
('documents','archive','ged.archive','Archiver un document GED','GED','Archiver et restaurer une pièce GED',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

-- Compatibilité des habilitations historiques : cette initialisation ne sert
-- qu'à préserver les droits existants. Les décisions runtime utilisent les permissions.
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code='ged.upload'
WHERE r.code IN('SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','RECEPTIONIST','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER','TECHNICIAN','DELIVERY_MANAGER','ACCOUNTANT','PARTS_MANAGER','WAREHOUSE_CLERK');

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code='ged.archive'
WHERE r.code IN('SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SERVICE_MANAGER','WORKSHOP_MANAGER','DELIVERY_MANAGER','ACCOUNTANT','PARTS_MANAGER');
