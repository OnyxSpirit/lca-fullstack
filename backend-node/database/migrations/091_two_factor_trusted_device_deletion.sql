INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('auth','delete','auth.2fa.devices.delete','Supprimer les appareils de confiance révoqués','Supprimer les appareils de confiance révoqués','Sécurité et authentification','Supprimer définitivement les appareils de confiance déjà révoqués dans le périmètre attribué',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

-- Seul le rôle système authentique est amorcé. Les rôles personnalisés restent inchangés
-- et peuvent recevoir ensuite cette permission via la matrice RBAC dynamique.
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL'
FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
  AND p.code='auth.2fa.devices.delete'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
