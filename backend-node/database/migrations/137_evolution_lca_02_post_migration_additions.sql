-- Rétablit de façon additive les ajouts conçus après la première exécution de 135.
ALTER TABLE service_diagnostics
  ADD COLUMN tax_justification VARCHAR(1000) NULL AFTER tax_mode;

-- Le workflow de retour de vente directe existant journalise déjà ce type.
ALTER TABLE part_movements
  MODIFY COLUMN movement_type ENUM(
    'purchase','sale','repair_order','transfer_in','transfer_out','return',
    'inventory','adjustment','reservation','release','internal_delivery','sav_return','sale_return'
  ) NOT NULL;
