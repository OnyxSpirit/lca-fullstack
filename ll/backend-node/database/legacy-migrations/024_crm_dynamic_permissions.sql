-- Permissions dynamiques fines du module CRM & Prospects.
-- Migration additive et idempotente : aucune donnée métier n'est supprimée.
INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('crm','view','crm.activity.view','Voir les activités CRM','CRM & Prospection','Consulter la chronologie des prospects accessibles',TRUE),
('crm','create','crm.activity.create','Créer une activité CRM','CRM & Prospection','Ajouter une activité à un prospect accessible',TRUE),
('crm','create','crm.appointment.create','Planifier un rendez-vous CRM','CRM & Prospection','Planifier un rendez-vous commercial',TRUE),
('crm','update','crm.pipeline.advance','Faire progresser le pipeline','CRM & Prospection','Faire évoluer une opportunité dans le pipeline',TRUE),
('crm','update','crm.prospect.lose','Clôturer un prospect perdu','CRM & Prospection','Clôturer une opportunité avec un motif de perte',TRUE),
('crm','create','crm.test_drive.create','Créer un essai depuis le CRM','CRM & Prospection','Démarrer un essai routier depuis une opportunité',TRUE),
('crm','create','crm.offer.prepare','Préparer une offre CRM','CRM & Prospection','Préparer un devis pour une opportunité',TRUE);

-- Préserve les capacités historiques à l'installation. Les administrateurs
-- peuvent ensuite les retirer ou modifier leur scope dans le RBAC dynamique.
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND p.code IN('crm.activity.view','crm.activity.create','crm.appointment.create','crm.pipeline.advance','crm.prospect.lose','crm.test_drive.create','crm.offer.prepare');

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'CONCESSION' FROM roles r JOIN permissions p
WHERE r.code='DIRECTOR' AND p.code IN('crm.activity.view','crm.activity.create','crm.appointment.create','crm.pipeline.advance','crm.prospect.lose','crm.test_drive.create','crm.offer.prepare','crm.prospect.assign');

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code IN('SALES_MANAGER','SALES_AGENT') AND p.code IN('crm.activity.view','crm.activity.create','crm.appointment.create','crm.pipeline.advance','crm.prospect.lose','crm.test_drive.create','crm.offer.prepare');

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='SALES_MANAGER' AND p.code='crm.prospect.assign';

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='RECEPTIONIST' AND p.code IN('crm.prospect.assign','crm.activity.view');
