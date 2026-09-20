-- Clés explicites au scope concession. Priorité TVA :
-- billing.default_vat_rate existant > defaultVatRate > default_vat_rate > erp_configuration > 18.9.
INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description)
SELECT 'concession',c.id,'billing.default_vat_rate',COALESCE(
 (SELECT s.setting_value FROM settings s WHERE s.setting_key='defaultVatRate' ORDER BY s.scope_type='concession' DESC LIMIT 1),
 (SELECT s.setting_value FROM settings s WHERE s.setting_key='default_vat_rate' ORDER BY s.scope_type='concession' DESC LIMIT 1),
 (SELECT JSON_EXTRACT(s.setting_value,'$.generalConfig.defaultVatRate') FROM settings s WHERE s.setting_key='erp_configuration' LIMIT 1),JSON_EXTRACT('18.9','$')),'TVA par défaut future'
FROM concessions c ON DUPLICATE KEY UPDATE setting_value=settings.setting_value;

INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description)
SELECT 'concession',c.id,k.setting_key,k.setting_value,'Tarif atelier horaire futur'
FROM concessions c JOIN (
 SELECT 'workshop.rate_t1' setting_key,JSON_EXTRACT('35000','$') setting_value UNION ALL
 SELECT 'workshop.rate_t2',JSON_EXTRACT('45000','$') UNION ALL
 SELECT 'workshop.rate_t3',JSON_EXTRACT('55000','$') UNION ALL
 SELECT 'workshop.rate_t4',JSON_EXTRACT('45000','$')
) k ON TRUE ON DUPLICATE KEY UPDATE setting_value=settings.setting_value;

-- Les anciennes lignes sont conservées pour audit et compatibilité Nest.
