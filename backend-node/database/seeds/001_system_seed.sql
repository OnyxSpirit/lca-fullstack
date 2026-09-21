-- Données système idempotentes. Aucun compte, secret ni donnée métier de recette.
INSERT INTO payment_methods(name,code,requires_reference) VALUES
('Espèces','CASH',FALSE),('Carte bancaire','CARD',TRUE),
('Virement bancaire','BANK_TRANSFER',TRUE),('Chèque','CHECK',TRUE),
('Mobile Money','MOBILE_MONEY',TRUE),('Financement bancaire','BANK_FINANCING',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),requires_reference=VALUES(requires_reference);

INSERT INTO roles(name,code,description,is_system,is_active) VALUES
('Super Administrateur','SUPER_ADMIN','Configuration globale et supervision',TRUE,TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_active=TRUE;

INSERT INTO delivery_checklist_templates(template_code,agency_id,item_name,category,is_required,sort_order) VALUES
('CLEAN_INTERIOR',NULL,'Nettoyage intérieur','preparation',TRUE,10),('CLEAN_EXTERIOR',NULL,'Nettoyage extérieur','preparation',TRUE,20),
('VISUAL_CHECK',NULL,'Contrôle esthétique','quality',TRUE,30),('MECHANICAL_CHECK',NULL,'Contrôle mécanique','quality',TRUE,40),
('ADMIN_DOCUMENTS',NULL,'Documents administratifs complets','documents',TRUE,50),('ACCESSORIES',NULL,'Accessoires installés','preparation',TRUE,60),
('ENERGY_LEVEL',NULL,'Carburant ou batterie chargé','preparation',TRUE,70),('SECOND_KEY',NULL,'Double des clés remis','handover',TRUE,80),
('VEHICLE_TOUR',NULL,'Présentation du véhicule au client','handover',TRUE,90),('FINAL_QUALITY',NULL,'Validation qualité finale','quality',TRUE,100)
ON DUPLICATE KEY UPDATE item_name=VALUES(item_name),category=VALUES(category),is_required=VALUES(is_required),sort_order=VALUES(sort_order),is_active=TRUE;

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
('roles','delete','roles.delete','Supprimer un rôle','Rôles & habilitations','Réaffecter ses utilisateurs puis supprimer un rôle métier',TRUE),
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

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('crm','view','crm.activity.view','Voir les activités CRM','CRM & Prospection','Consulter la chronologie des prospects accessibles',TRUE),
('crm','create','crm.activity.create','Créer une activité CRM','CRM & Prospection','Ajouter une activité à un prospect accessible',TRUE),
('crm','create','crm.appointment.create','Planifier un rendez-vous CRM','CRM & Prospection','Planifier un rendez-vous commercial',TRUE),
('crm','update','crm.pipeline.advance','Faire progresser le pipeline','CRM & Prospection','Faire évoluer une opportunité dans le pipeline',TRUE),
('crm','update','crm.prospect.lose','Clôturer un prospect perdu','CRM & Prospection','Clôturer une opportunité avec un motif de perte',TRUE),
('crm','create','crm.test_drive.create','Créer un essai depuis le CRM','CRM & Prospection','Démarrer un essai routier depuis une opportunité',TRUE),
('crm','create','crm.offer.prepare','Préparer une offre CRM','CRM & Prospection','Préparer un devis pour une opportunité',TRUE);

INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('customers','create','customers.create','Créer un client','Clients 360°','Créer une fiche client',TRUE),
('customers','update','customers.update','Modifier un client','Clients 360°','Modifier une fiche et ses contacts',TRUE),
('customers','assign','customers.assign','Affecter un client','Clients 360°','Changer le commercial responsable',TRUE),
('customers','view','customers.history.view','Voir l’historique client','Clients 360°','Consulter la timeline de la fiche',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('vehicles','create','vehicles.create','Créer un véhicule','Véhicules','Créer une entrée de stock',TRUE),
('vehicles','update','vehicles.update','Modifier un véhicule','Véhicules','Modifier les caractéristiques du véhicule',TRUE),
('vehicles','update','vehicles.status.update','Changer le statut véhicule','Véhicules','Effectuer une transition manuelle autorisée',TRUE),
('vehicles','update','vehicles.images.manage','Gérer les images véhicule','Véhicules','Ajouter, ordonner ou supprimer les photos',TRUE),
('vehicles','assign','vehicles.assign_agency','Transférer un véhicule','Véhicules','Changer l’agence ou l’emplacement du véhicule',TRUE),
('vehicles','delete','vehicles.archive','Archiver un véhicule','Véhicules','Retirer sans suppression physique un véhicule du catalogue',TRUE),
('vehicles','view','vehicles.financials.view','Voir les coûts véhicule','Véhicules','Consulter coûts, marge et historique tarifaire',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('sales','cancel','sales.cancel','Annuler une vente','Ventes','Annuler une vente sans paiement ni livraison engagée',TRUE),
('sales','assign','sales.assign','Affecter une vente','Ventes','Choisir ou modifier le commercial propriétaire',TRUE),
('sales','update','sales.discount.manage','Gérer les remises','Ventes','Accorder une remise commerciale lors de la création',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('quotations','view','quotations.view','Consulter les devis','Devis','Consulter les devis et leur représentation PDF',TRUE),
('quotations','create','quotations.create','Créer un devis','Devis','Créer un devis depuis une opportunité éligible',TRUE),
('quotations','update','quotations.update','Modifier un devis','Devis','Modifier un devis encore au statut brouillon',TRUE),
('quotations','validate','quotations.validate','Émettre un devis','Devis','Valider et émettre un devis brouillon',TRUE),
('quotations','cancel','quotations.cancel','Annuler ou rejeter un devis','Devis','Annuler ou rejeter un devis non converti',TRUE),
('quotations','convert','quotations.convert','Convertir un devis','Devis','Autoriser le passage d’un devis émis vers le module Ventes',TRUE),
('quotations','update','quotations.discount.manage','Gérer les remises de devis','Devis','Accorder ou modifier une remise sur un devis',TRUE)
,
('sales','update','sales.tax.override','Dérogation fiscale','Ventes','Modifier le régime fiscal, le mode de saisie ou le taux par défaut',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active)
VALUES('delivery','update','delivery.cancel','Annuler une livraison','Livraisons','Annuler une livraison avant sa remise physique',TRUE)
ON DUPLICATE KEY UPDATE
  module=VALUES(module),
  action=VALUES(action),
  name=VALUES(name),
  group_name=VALUES(group_name),
  description=VALUES(description),
  is_active=TRUE;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('service','update','service.order.receive','Réceptionner un véhicule SAV','SAV & Atelier','Enregistrer l’état de réception du véhicule',TRUE),
('service','approve','service.order.approve','Enregistrer la décision client','SAV & Atelier','Tracer l’approbation ou le refus du client',TRUE),
('service','update','service.order.ready','Déclarer un OR prêt','SAV & Atelier','Valider la disponibilité pour restitution',TRUE),
('service','invoice','service.order.invoice','Transmettre un OR à la facturation','SAV & Atelier','Déclencher la facturation sous réserve des permissions Billing',TRUE),
('service','cancel','service.order.cancel','Annuler un ordre de réparation','SAV & Atelier','Annuler un OR non terminal avec motif',TRUE),
('service','abandon','service.order.abandon','Abandonner un ordre de réparation','SAV & Atelier','Suspendre, régulariser et finaliser un abandon client',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('workshop','update','workshop.plan','Planifier l’atelier','Atelier','Créer et modifier le planning atelier',TRUE),
('workshop','assign','workshop.assign_technician','Affecter un technicien','Atelier','Affecter ou réaffecter un technicien',TRUE),
('workshop','assign','workshop.assign_bay','Affecter un pont','Atelier','Affecter un pont ou une baie à un créneau',TRUE),
('workshop','view','workshop.bay.view','Voir les ponts','Atelier','Consulter les ponts et baies',TRUE),
('workshop','manage','workshop.bay.manage','Gérer les ponts','Atelier','Configurer le statut et la capacité des ponts',TRUE),
('workshop','manage','workshop.session.manage','Superviser les sessions atelier','Atelier','Superviser les sessions techniques dans son périmètre',TRUE),
('workshop','view','workshop.time.view','Voir les temps atelier','Atelier','Consulter les temps techniques dans son périmètre',TRUE),
('workshop','adjust','workshop.time.adjust','Corriger les temps atelier','Atelier','Corriger un temps avec motif et historique',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('parts','view','parts.reservation.view','Voir les réservations de pièces','Pièces & stock','Consulter les réservations liées aux ordres de réparation',TRUE),
('parts','create','parts.reservation.create','Réserver des pièces','Pièces & stock','Réserver du stock disponible pour un ordre de réparation',TRUE),
('parts','update','parts.reservation.release','Libérer une réservation de pièces','Pièces & stock','Libérer une réservation active sans consommer le stock physique',TRUE),
('parts','update','parts.reservation.consume','Consommer une réservation de pièces','Pièces & stock','Consommer une réservation active et décrémenter le stock physique',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('documents','create','ged.upload','Déposer un document GED','GED','Ajouter une pièce à un dossier métier',TRUE),
('documents','archive','ged.archive','Archiver un document GED','GED','Archiver et restaurer une pièce GED',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','view','hr.view','Accéder à RH & Administration','RH & Administration','Accéder au module RH & Administration',TRUE),
('hr','view','hr.employees.view','Voir le personnel','RH & Administration','Consulter les profils employés dans son périmètre',TRUE),
('hr','manage','hr.employees.manage','Gérer le personnel','RH & Administration','Créer et modifier les profils employés dans son périmètre',TRUE),
('hr','view','hr.salary.view','Voir les salaires','RH & Administration','Consulter les salaires et la masse salariale dans son périmètre',TRUE),
('hr','manage','hr.salary.manage','Gérer les salaires','RH & Administration','Ajouter une évolution salariale dans son périmètre',TRUE),
('hr','view','hr.stock.view','Voir les stocks internes','RH & Administration','Consulter les articles et mouvements internes',TRUE),
('hr','manage','hr.stock.manage','Gérer les articles internes','RH & Administration','Créer et modifier les articles de stock interne',TRUE),
('hr','create','hr.stock.entry','Enregistrer une entrée interne','RH & Administration','Ajouter une quantité au stock interne',TRUE),
('hr','create','hr.stock.exit','Enregistrer une sortie interne','RH & Administration','Retirer une quantité disponible du stock interne',TRUE),
('hr','view','hr.budget.view','Voir les budgets','RH & Administration','Consulter les budgets de son périmètre',TRUE),
('hr','manage','hr.budget.manage','Gérer les budgets','RH & Administration','Créer et modifier les budgets de son périmètre',TRUE),
('hr','view','hr.expense.view','Voir les dépenses','RH & Administration','Consulter les dépenses de son périmètre',TRUE),
('hr','create','hr.expense.create','Créer une dépense','RH & Administration','Enregistrer une dépense dans la limite disponible',TRUE),
('hr','manage','hr.expense.manage','Gérer les dépenses','RH & Administration','Administrer les dépenses de son périmètre',TRUE),
('hr','view','hr.reporting.view','Voir le reporting RH','RH & Administration','Consulter les indicateurs RH et administratifs autorisés',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

-- Après le catalogue complet : chaque permission active est globale pour le rôle système.
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.is_active=TRUE
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
