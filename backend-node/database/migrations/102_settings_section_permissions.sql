-- Permissions additives par section. Aucune attribution automatique : les rôles
-- métier restent inchangés et le Super Administrateur choisit les délégations.
INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('settings','view','settings.general.view','Voir l’identité et les paramètres métier','Paramètres · Identité & fiscalité','Consulter l’identité, la fiscalité et les durées CRM de la concession',TRUE),
('settings','update','settings.general.manage','Gérer l’identité et les paramètres métier','Paramètres · Identité & fiscalité','Modifier l’identité, la fiscalité, les durées CRM et le logo documentaire',TRUE),
('settings','view','settings.documents.view','Voir les références documentaires','Paramètres · Documents','Consulter les catégories et types documentaires',TRUE),
('settings','update','settings.documents.manage','Gérer les références documentaires','Paramètres · Documents','Créer et modifier les catégories et types documentaires',TRUE),
('settings','view','settings.workshop_rates.view','Voir les barèmes atelier','Paramètres · Atelier','Consulter les barèmes horaires atelier',TRUE),
('settings','update','settings.workshop_rates.manage','Gérer les barèmes atelier','Paramètres · Atelier','Créer et modifier les barèmes horaires atelier',TRUE),
('settings','view','settings.agencies.view','Voir les agences dans les paramètres','Paramètres · Agences','Consulter l’administration des agences de son périmètre',TRUE),
('settings','update','settings.agencies.manage','Gérer les agences','Paramètres · Agences','Créer, modifier, activer et désactiver les agences de son périmètre',TRUE);
