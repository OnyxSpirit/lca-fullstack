-- B.3.4.2.3 LOT 2 : habilitations dynamiques des profils prestataires.
INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('hr','view','hr.providers.view','Consulter les prestataires','Consulter les prestataires','RH & Administration','Consulter les identités, profils et rattachements prestataires dans le périmètre attribué',TRUE),
('hr','manage','hr.providers.manage','Gérer les prestataires','Gérer les prestataires','RH & Administration','Créer, modifier, suspendre et réactiver les prestataires dans le périmètre attribué',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

-- Les rôles personnalisés restent administrés par la matrice RBAC.
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL'
FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
  AND p.code IN ('hr.providers.view','hr.providers.manage')
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
