-- Matrice minimale idempotente pour les modules administratifs et notifications.
-- Les INSERT IGNORE préservent toutes les permissions/customisations existantes.
INSERT IGNORE INTO permissions(module,action,code,description) VALUES
('users','view','users.view','Consulter les utilisateurs'),
('users','update','users.manage','Gérer les utilisateurs'),
('settings','view','settings.view','Consulter les paramètres'),
('settings','update','settings.manage','Gérer les paramètres concession'),
('notifications','view','notifications.view','Consulter ses notifications');

INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN('users.view','users.manage')
WHERE r.code IN('SUPER_ADMIN','DIRECTOR');

INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code='settings.view'
WHERE r.code IN('SUPER_ADMIN','DIRECTOR','WORKSHOP_MANAGER','PARTS_MANAGER');

INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code='settings.manage'
WHERE r.code IN('SUPER_ADMIN','DIRECTOR');

INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code='notifications.view';
