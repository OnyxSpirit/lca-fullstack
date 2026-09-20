-- Permission dynamique dédiée à l'annulation d'une livraison non finalisée.
INSERT INTO permissions(module,action,code,name,group_name,description,is_active)
VALUES('delivery','update','delivery.cancel','Annuler une livraison','Livraisons','Annuler une livraison avant sa remise physique',TRUE)
ON DUPLICATE KEY UPDATE
  module=VALUES(module),
  action=VALUES(action),
  name=VALUES(name),
  group_name=VALUES(group_name),
  description=VALUES(description),
  is_active=TRUE;
