-- LOT B.3.4.3 - Les garages utilisent le référentiel d'emplacements existant.
-- L'extension de l'ENUM préserve les valeurs, index et clés étrangères existants.
ALTER TABLE vehicle_locations
  MODIFY COLUMN type ENUM('PARC','SHOWROOM','GARAGE') NOT NULL;
