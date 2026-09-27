ALTER TABLE warranty_providers
  ADD COLUMN warranty_available BOOLEAN NOT NULL DEFAULT TRUE AFTER is_active,
  ADD COLUMN default_warranty_months SMALLINT UNSIGNED NULL AFTER warranty_available,
  ADD COLUMN default_mileage_limit INT UNSIGNED NULL AFTER default_warranty_months,
  ADD CONSTRAINT chk_wp_default_months CHECK(default_warranty_months IS NULL OR default_warranty_months BETWEEN 1 AND 240),
  ADD CONSTRAINT chk_wp_default_mileage CHECK(default_mileage_limit IS NULL OR default_mileage_limit > 0);

ALTER TABLE brands
  ADD COLUMN warranty_provider_id BIGINT UNSIGNED NULL AFTER code,
  ADD INDEX idx_brand_warranty_provider(warranty_provider_id),
  ADD CONSTRAINT fk_brand_warranty_provider FOREIGN KEY(warranty_provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('settings','view','settings.manufacturers.view','Voir les constructeurs','Paramètres','Consulter le référentiel Constructeurs',TRUE),
('settings','create','settings.manufacturers.create','Créer un constructeur','Paramètres','Créer un constructeur et ses valeurs de garantie par défaut',TRUE),
('settings','update','settings.manufacturers.update','Modifier un constructeur','Paramètres','Modifier un constructeur sans altérer les contrats historiques',TRUE),
('settings','update','settings.manufacturers.disable','Activer ou désactiver un constructeur','Paramètres','Gérer la disponibilité future sans suppression',TRUE);
