-- Permissions dynamiques dédiées aux étapes métier SAV qui étaient auparavant regroupées.
INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('service','update','service.order.receive','Réceptionner un véhicule SAV','SAV & Atelier','Enregistrer l’état de réception du véhicule',TRUE),
('service','approve','service.order.approve','Enregistrer la décision client','SAV & Atelier','Tracer l’approbation ou le refus du client',TRUE),
('service','update','service.order.ready','Déclarer un OR prêt','SAV & Atelier','Valider la disponibilité pour restitution',TRUE),
('service','invoice','service.order.invoice','Transmettre un OR à la facturation','SAV & Atelier','Déclencher la facturation sous réserve des permissions Billing',TRUE),
('service','cancel','service.order.cancel','Annuler un ordre de réparation','SAV & Atelier','Annuler un OR non terminal avec motif',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;
