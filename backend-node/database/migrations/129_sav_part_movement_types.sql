-- Les flux physiques introduits par la migration 106 écrivent ces deux
-- types dans part_movements. L'ENUM historique doit les accepter afin que la
-- sortie magasin et la réintégration d'un retour SAV restent transactionnelles.
ALTER TABLE part_movements
  MODIFY COLUMN movement_type ENUM(
    'purchase','sale','repair_order','transfer_in','transfer_out','return',
    'inventory','adjustment','reservation','release','internal_delivery','sav_return'
  ) NOT NULL;
