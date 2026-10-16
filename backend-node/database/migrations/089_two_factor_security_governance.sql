INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('auth','view','auth.2fa.settings.view','Voir les paramètres généraux 2FA','Voir les paramètres généraux 2FA','Sécurité et authentification','Consulter la gouvernance globale de la double authentification',TRUE),
('auth','manage','auth.2fa.settings.manage','Gérer les paramètres généraux 2FA','Gérer les paramètres généraux 2FA','Sécurité et authentification','Modifier la gouvernance globale de la double authentification',TRUE),
('auth','view','auth.2fa.devices.view','Voir les appareils de confiance','Voir les appareils de confiance','Sécurité et authentification','Consulter les appareils de confiance dans le périmètre attribué',TRUE),
('auth','revoke','auth.2fa.devices.revoke','Révoquer les appareils de confiance','Révoquer les appareils de confiance','Sécurité et authentification','Révoquer les appareils de confiance dans le périmètre attribué',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL'
FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
  AND p.code IN('auth.2fa.settings.view','auth.2fa.settings.manage','auth.2fa.devices.view','auth.2fa.devices.revoke')
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description,updated_by) VALUES
('global',0,'security.2fa.trusted_devices.enabled',CAST('false' AS JSON),'Activation future des appareils de confiance (lot 3 requis)',NULL),
('global',0,'security.2fa.trusted_devices.duration_days',CAST('7' AS JSON),'Durée de confiance demandée, plafonnée par la politique',NULL),
('global',0,'security.2fa.trusted_devices.max_duration_days',CAST('30' AS JSON),'Plafond de confiance, limité à 30 jours par le code',NULL),
('global',0,'security.2fa.strong_auth.duration_minutes',CAST('10' AS JSON),'Durée de validité du step-up',NULL)
ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
