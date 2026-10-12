-- Lot 14C.2 : capacités Atelier dédiées aux véhicules extérieurs.
-- Aucune attribution de rôle : l'administrateur RBAC délègue explicitement ces droits.
INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('workshop','view','workshop.vehicles.view','Rechercher les véhicules Atelier','SAV & Atelier','Rechercher les véhicules accessibles avant création ou rattachement',TRUE),
('workshop','create','workshop.external_vehicle.create','Créer un véhicule extérieur','SAV & Atelier','Créer dans le référentiel central un véhicule extérieur non commercial',TRUE),
('workshop','create','workshop.vehicle.associations.create','Associer client et véhicule','SAV & Atelier','Créer une relation courante client-véhicule',TRUE),
('workshop','view','workshop.vehicle.associations.view','Voir les associations client-véhicule','SAV & Atelier','Consulter les relations courantes et leur historique',TRUE),
('workshop','update','workshop.vehicle.associations.close','Clôturer une association client-véhicule','SAV & Atelier','Clôturer une relation sans supprimer son historique',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;
