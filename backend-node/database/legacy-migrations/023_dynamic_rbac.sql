-- RBAC dynamique : migration additive, sans suppression de données.
-- Exécuter après les migrations existantes sur une sauvegarde validée.

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER is_system,
  ADD COLUMN IF NOT EXISTS created_by BIGINT UNSIGNED NULL AFTER is_active,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD INDEX IF NOT EXISTS idx_roles_active (is_active);

ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS label VARCHAR(150) NULL AFTER code,
  ADD COLUMN IF NOT EXISTS group_name VARCHAR(80) NULL AFTER label,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER description,
  ADD INDEX IF NOT EXISTS idx_permissions_group (group_name,is_active);

ALTER TABLE role_permissions
  ADD COLUMN IF NOT EXISTS scope ENUM('OWN','AGENCY','CONCESSION','GLOBAL') NULL AFTER permission_id;

-- Une affectation multiple historique ne doit jamais être supprimée arbitrairement.
-- La migration s'arrête explicitement afin qu'un administrateur choisisse le rôle à conserver.
DELIMITER $$
CREATE PROCEDURE ensure_single_primary_role()
BEGIN
  IF EXISTS(SELECT user_id FROM user_roles GROUP BY user_id HAVING COUNT(*) > 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='MULTIPLE_USER_ROLES: choisir explicitement le rôle principal avant migration';
  END IF;
END$$
DELIMITER ;
CALL ensure_single_primary_role();
DROP PROCEDURE ensure_single_primary_role;

ALTER TABLE user_roles ADD UNIQUE KEY uk_user_roles_primary (user_id);

-- Le rôle système est immuable dans son identité ; les autres profils peuvent être configurés.
UPDATE roles SET is_system=TRUE,is_active=TRUE WHERE code='SUPER_ADMIN';
UPDATE roles SET is_active=TRUE WHERE is_active IS NULL;

-- Catalogue minimal des permissions réellement utilisées par l'administration RBAC.
-- Les permissions métier complémentaires sont ajoutées progressivement avec leur route protégée.
INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('dashboard','view','dashboard.view','Voir le tableau de bord','Général','Accéder au tableau de bord',TRUE),
('notifications','view','notifications.view','Voir les notifications','Général','Consulter ses notifications',TRUE),
('users','view','users.view','Voir les utilisateurs','Utilisateurs','Consulter les utilisateurs',TRUE),
('users','create','users.create','Créer un utilisateur','Utilisateurs','Créer un compte utilisateur',TRUE),
('users','update','users.update','Modifier un utilisateur','Utilisateurs','Modifier les données d’un utilisateur',TRUE),
('users','update','users.disable','Activer ou désactiver un utilisateur','Utilisateurs','Modifier le statut d’un utilisateur',TRUE),
('users','update','users.reset_password','Réinitialiser un mot de passe','Utilisateurs','Réinitialiser un mot de passe',TRUE),
('users','assign','users.assign_role','Affecter un rôle','Utilisateurs','Affecter le rôle principal',TRUE),
('users','assign','users.assign_agency','Affecter une agence','Utilisateurs','Affecter ou changer l’agence',TRUE),
('roles','view','roles.view','Voir les rôles','Rôles & habilitations','Consulter les rôles',TRUE),
('roles','create','roles.create','Créer un rôle','Rôles & habilitations','Créer un rôle dynamique',TRUE),
('roles','update','roles.update','Modifier un rôle','Rôles & habilitations','Modifier un rôle non système',TRUE),
('roles','update','roles.disable','Désactiver un rôle','Rôles & habilitations','Désactiver un rôle non système',TRUE),
('roles','assign','roles.permissions.manage','Gérer les permissions d’un rôle','Rôles & habilitations','Configurer permissions et scopes',TRUE),
('settings','view','settings.view','Voir les paramètres','Paramètres','Consulter les paramètres',TRUE),
('settings','update','settings.update','Modifier les paramètres','Paramètres','Modifier les paramètres',TRUE),
('crm','view','crm.prospect.view','Voir les prospects','CRM & Prospection','Consulter les prospects',TRUE),
('crm','create','crm.prospect.create','Créer un prospect','CRM & Prospection','Créer un prospect',TRUE),
('crm','update','crm.prospect.update','Modifier un prospect','CRM & Prospection','Modifier un prospect',TRUE),
('crm','assign','crm.prospect.assign','Affecter un prospect','CRM & Prospection','Affecter un prospect',TRUE),
('sales','view','sales.view','Voir les ventes','Ventes','Consulter les ventes',TRUE),
('sales','create','sales.create','Créer une vente','Ventes','Créer une vente',TRUE),
('billing','view','billing.view','Voir la facturation','Facturation','Consulter les factures',TRUE),
('billing','view','billing.invoice.view','Voir les factures','Facturation','Consulter les factures et leurs documents',TRUE),
('billing','create','billing.invoice.create','Créer une facture','Facturation','Créer une facture',TRUE),
('billing','update','billing.invoice.update','Modifier une facture','Facturation','Modifier un brouillon de facture',TRUE),
('billing','update','billing.invoice.issue','Émettre une facture','Facturation','Émettre une facture brouillon',TRUE),
('billing','update','billing.invoice.cancel','Annuler une facture','Facturation','Annuler une facture non encaissée',TRUE),
('billing','view','billing.payment.view','Voir les paiements','Facturation','Consulter les règlements et reçus',TRUE),
('billing','update','billing.payment.collect','Encaisser un paiement','Facturation','Enregistrer un paiement',TRUE),
('billing','update','billing.payment.refund','Rembourser un paiement','Facturation','Rembourser un paiement confirmé',TRUE),
('billing','export','billing.export','Exporter le journal comptable','Facturation','Exporter les données comptables',TRUE),
('workshop','view','workshop.view','Voir l’atelier','Atelier','Consulter l’atelier',TRUE),
('service','view','service.order.view','Voir les ordres de réparation','SAV & Atelier','Consulter les OR',TRUE),
('service','create','service.order.create','Créer un ordre de réparation','SAV & Atelier','Créer un OR',TRUE),
('service','update','service.order.update','Modifier un ordre de réparation','SAV & Atelier','Modifier un OR',TRUE),
('service','assign','service.order.assign_advisor','Affecter un conseiller SAV','SAV & Atelier','Affecter un conseiller SAV',TRUE),
('service','assign','service.order.assign_technician','Affecter un technicien','SAV & Atelier','Affecter un technicien',TRUE),
('service','update','service.order.diagnose','Diagnostiquer un OR','SAV & Atelier','Enregistrer un diagnostic',TRUE),
('service','update','service.order.advance','Faire progresser un OR','SAV & Atelier','Faire progresser le workflow SAV',TRUE),
('service','update','service.order.quality_control','Contrôler la qualité SAV','SAV & Atelier','Enregistrer le contrôle qualité',TRUE),
('service','update','service.order.handover','Remettre un véhicule SAV','SAV & Atelier','Enregistrer la remise après contrôles',TRUE),
('service','update','service.order.close','Clôturer un ordre SAV','SAV & Atelier','Clôturer un OR livré',TRUE),
('service','view','service.documents.view','Voir les documents SAV','SAV & Atelier','Consulter les documents SAV',TRUE),
('service','update','service.documents.manage','Gérer les documents SAV','SAV & Atelier','Gérer les documents SAV',TRUE),
('workshop','update','workshop.resources.manage','Gérer les ressources atelier','Atelier','Gérer ponts et ressources',TRUE),
('parts','view','parts.view','Voir les pièces','Pièces & stock','Consulter les pièces',TRUE),
('delivery','view','delivery.view','Voir les livraisons','Livraisons','Consulter les livraisons',TRUE),
('delivery','create','delivery.schedule','Planifier une livraison','Livraisons','Créer ou reporter une livraison',TRUE),
('delivery','view','delivery.checklist.view','Voir les checklistes livraison','Livraisons','Consulter les checklistes',TRUE),
('delivery','update','delivery.checklist.manage','Gérer les checklistes livraison','Livraisons','Modifier checklistes et documents de remise',TRUE),
('delivery','view','delivery.documents.view','Voir les documents livraison','Livraisons','Consulter les documents de livraison',TRUE),
('delivery','update','delivery.signature.capture','Capturer une signature livraison','Livraisons','Capturer la signature de remise',TRUE),
('delivery','update','delivery.complete','Finaliser une livraison','Livraisons','Finaliser la remise après contrôles métier',TRUE),
('documents','view','ged.view','Voir la GED','GED','Consulter les documents',TRUE),
('reporting','view','reporting.view','Voir les rapports','Reporting','Consulter les rapports',TRUE);

-- Routes protégées par le frontend : ce catalogue évite une régression lors de
-- la bascule progressive des modules historiques vers les permissions fines.
INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('showroom','view','showroom.view','Voir le showroom','Showroom','Consulter accueil et essais',TRUE),
('showroom','create','showroom.visitor.create','Enregistrer un visiteur','Showroom','Créer une visite showroom',TRUE),
('showroom','update','showroom.visitor.update','Modifier un visiteur','Showroom','Mettre à jour une visite showroom',TRUE),
('showroom','assign','showroom.assign','Affecter un commercial','Showroom','Affecter une visite à un commercial',TRUE),
('showroom','update','showroom.status.update','Changer le statut showroom','Showroom','Faire évoluer une visite showroom',TRUE),
('vehicles','view','vehicles.view','Voir les véhicules','Véhicules','Consulter le catalogue véhicules',TRUE),
('customers','view','customers.view','Voir les clients','Clients 360°','Consulter les fiches clients',TRUE),
('quotations','view','quotations.view','Voir les devis','Devis','Consulter les devis',TRUE),
('sales','update','sales.update','Modifier une vente','Ventes','Modifier une vente autorisée',TRUE),
('sales','update','sales.confirm','Confirmer une vente','Ventes','Confirmer une vente',TRUE),
('delivery','update','delivery.prepare','Préparer une livraison','Livraisons','Préparer une livraison',TRUE),
('delivery','update','delivery.complete','Terminer une livraison','Livraisons','Finaliser une livraison',TRUE),
('workshop','update','workshop.schedule.manage','Gérer le planning atelier','Atelier','Planifier les interventions',TRUE),
('workshop','view','workshop.schedule.view','Voir le planning atelier','Atelier','Consulter les affectations et disponibilités',TRUE),
('workshop','view','workshop.intervention.view','Voir les interventions','Atelier','Consulter les interventions planifiées',TRUE),
('workshop','assign','workshop.intervention.assign','Affecter une intervention','Atelier','Affecter technicien et pont',TRUE),
('workshop','update','workshop.intervention.update','Mettre à jour une intervention','Atelier','Mettre à jour le suivi opérationnel',TRUE),
('workshop','view','workshop.session.view','Voir les pointages atelier','Atelier','Consulter les sessions de travail',TRUE),
('workshop','update','workshop.session.track','Pointer une session atelier','Atelier','Démarrer et arrêter son pointage',TRUE),
('workshop','view','workshop.technicians.view','Voir les techniciens','Atelier','Consulter les ressources humaines atelier',TRUE),
('workshop','update','workshop.technicians.manage','Gérer les techniciens','Atelier','Créer et administrer les techniciens',TRUE),
('workshop','view','workshop.resources.view','Voir les ponts et indisponibilités','Atelier','Consulter les ressources atelier',TRUE),
('workshop','view','workshop.productivity.view','Voir la productivité atelier','Atelier','Consulter capacité, occupation et productivité',TRUE),
('parts','update','parts.stock.manage','Gérer le stock pièces','Pièces & stock','Gérer le stock pièces',TRUE),
('parts','view','parts.catalog.view','Voir le catalogue pièces','Pièces & stock','Consulter catégories et références',TRUE),
('parts','update','parts.catalog.manage','Gérer le catalogue pièces','Pièces & stock','Créer et modifier les références',TRUE),
('parts','view','parts.stock.view','Voir le stock pièces','Pièces & stock','Consulter stock et mouvements',TRUE),
('parts','update','parts.stock.adjust','Ajuster le stock','Pièces & stock','Corriger et retourner du stock',TRUE),
('parts','update','parts.stock.move','Transférer le stock','Pièces & stock','Déplacer du stock entre emplacements',TRUE),
('parts','view','parts.inventory.view','Voir les inventaires','Pièces & stock','Consulter les inventaires',TRUE),
('parts','update','parts.inventory.manage','Réaliser un inventaire','Pièces & stock','Enregistrer un comptage physique',TRUE),
('parts','view','parts.purchase_order.view','Voir les commandes fournisseur','Pièces & stock','Consulter les approvisionnements',TRUE),
('parts','create','parts.purchase_order.create','Créer une commande fournisseur','Pièces & stock','Créer un brouillon de commande',TRUE),
('parts','update','parts.purchase_order.update','Modifier une commande fournisseur','Pièces & stock','Modifier un brouillon de commande',TRUE),
('parts','update','parts.purchase_order.approve','Valider une commande fournisseur','Pièces & stock','Envoyer ou confirmer une commande',TRUE),
('parts','update','parts.purchase_order.receive','Réceptionner une commande fournisseur','Pièces & stock','Réceptionner et incrémenter le stock',TRUE),
('parts','view','parts.suppliers.view','Voir les fournisseurs','Pièces & stock','Consulter les fournisseurs',TRUE),
('parts','update','parts.suppliers.manage','Gérer les fournisseurs','Pièces & stock','Créer et modifier les fournisseurs',TRUE),
('parts','view','parts.reporting.view','Voir les rapports stock','Pièces & stock','Consulter les indicateurs stock',TRUE),
('reporting','export','reporting.export','Exporter les rapports','Reporting','Exporter les rapports',TRUE);

-- Profils historiques préservés : l'administration reste disponible après migration.
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p
WHERE r.code='SUPER_ADMIN';

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'CONCESSION' FROM roles r JOIN permissions p
WHERE r.code='DIRECTOR' AND p.code IN('dashboard.view','notifications.view','users.view','users.create','users.update','users.disable','users.reset_password','users.assign_role','users.assign_agency','roles.view','settings.view','settings.update','crm.prospect.view','sales.view','billing.view','workshop.view','parts.view','delivery.view','ged.view','reporting.view');

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'CONCESSION' FROM roles r JOIN permissions p
WHERE r.code='DIRECTOR';

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code IN('SALES_MANAGER','SALES_AGENT','RECEPTIONIST','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER','TECHNICIAN','PARTS_MANAGER','WAREHOUSE_CLERK','DELIVERY_MANAGER','ACCOUNTANT')
  AND p.code IN('dashboard.view','notifications.view');

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code IN('SALES_MANAGER','SALES_AGENT')
  AND p.code IN('crm.prospect.view','crm.prospect.create','crm.prospect.update','sales.view','sales.create','sales.update','showroom.view','vehicles.view','customers.view','quotations.view');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='RECEPTIONIST' AND p.code IN('crm.prospect.view','crm.prospect.create','crm.prospect.update','showroom.view','vehicles.view','customers.view');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code IN('SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER','TECHNICIAN') AND p.code IN('customers.view','vehicles.view','workshop.view','workshop.schedule.manage');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,CASE WHEN r.code='TECHNICIAN' THEN 'OWN' ELSE 'AGENCY' END FROM roles r JOIN permissions p
WHERE r.code IN('SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER','TECHNICIAN') AND p.code IN('workshop.schedule.view','workshop.intervention.view','workshop.session.view','workshop.session.track','workshop.technicians.view','workshop.resources.view');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code IN('SERVICE_MANAGER','WORKSHOP_MANAGER') AND p.code IN('workshop.intervention.assign','workshop.intervention.update','workshop.schedule.manage','workshop.technicians.manage','workshop.resources.manage','workshop.productivity.view');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code IN('PARTS_MANAGER','WAREHOUSE_CLERK') AND p.code IN('parts.view','parts.stock.manage','workshop.view');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code IN('PARTS_MANAGER','WAREHOUSE_CLERK') AND p.code IN('parts.catalog.view','parts.stock.view','parts.inventory.view','parts.purchase_order.view','parts.suppliers.view','parts.reporting.view');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='PARTS_MANAGER' AND p.code IN('parts.catalog.manage','parts.stock.adjust','parts.stock.move','parts.inventory.manage','parts.purchase_order.create','parts.purchase_order.update','parts.purchase_order.approve','parts.purchase_order.receive','parts.suppliers.manage');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='WAREHOUSE_CLERK' AND p.code IN('parts.stock.adjust','parts.stock.move','parts.inventory.manage','parts.purchase_order.receive');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='DELIVERY_MANAGER' AND p.code IN('delivery.view','delivery.prepare','delivery.complete','sales.view','vehicles.view','customers.view');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='DELIVERY_MANAGER' AND p.code IN('delivery.schedule','delivery.checklist.view','delivery.checklist.manage','delivery.documents.view','delivery.signature.capture');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='ACCOUNTANT' AND p.code IN('billing.view','billing.invoice.create','billing.payment.collect','sales.view','customers.view','reporting.view','reporting.export');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code='ACCOUNTANT' AND p.code IN('billing.invoice.view','billing.invoice.update','billing.invoice.issue','billing.invoice.cancel','billing.payment.view','billing.payment.refund','billing.export');
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p
WHERE r.code IN('SALES_MANAGER','SALES_AGENT','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER') AND p.code IN('billing.invoice.view','billing.payment.view');
