-- Permissions dynamiques du module Devis / Quotations.
INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('quotations','view','quotations.view','Consulter les devis','Devis','Consulter les devis et leur représentation PDF',TRUE),
('quotations','create','quotations.create','Créer un devis','Devis','Créer un devis depuis une opportunité éligible',TRUE),
('quotations','update','quotations.update','Modifier un devis','Devis','Modifier un devis encore au statut brouillon',TRUE),
('quotations','validate','quotations.validate','Émettre un devis','Devis','Valider et émettre un devis brouillon',TRUE),
('quotations','cancel','quotations.cancel','Annuler ou rejeter un devis','Devis','Annuler ou rejeter un devis non converti',TRUE),
('quotations','convert','quotations.convert','Convertir un devis','Devis','Autoriser le passage d’un devis émis vers le module Ventes',TRUE),
('quotations','update','quotations.discount.manage','Gérer les remises de devis','Devis','Accorder ou modifier une remise sur un devis',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

-- Attribution initiale de compatibilité. Le runtime ne dépend jamais de ces codes de rôle.
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code LIKE 'quotations.%' WHERE r.code='SUPER_ADMIN'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'CONCESSION' FROM roles r JOIN permissions p ON p.code LIKE 'quotations.%' WHERE r.code='DIRECTOR'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code LIKE 'quotations.%' WHERE r.code='SALES_MANAGER'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'OWN' FROM roles r JOIN permissions p ON p.code IN('quotations.view','quotations.create','quotations.update','quotations.validate','quotations.cancel','quotations.convert') WHERE r.code IN('SALES_AGENT','SALES_REP')
ON DUPLICATE KEY UPDATE scope=VALUES(scope);

-- Défense en profondeur : un devis ne peut référencer qu'une seule vente.
SET @has_uq_sales_quotation := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema=DATABASE() AND table_name='sales' AND index_name='uq_sales_quotation_id'
);
SET @sql_uq_sales_quotation := IF(
  @has_uq_sales_quotation=0,
  'ALTER TABLE sales ADD UNIQUE KEY uq_sales_quotation_id (quotation_id)',
  'SELECT 1'
);
PREPARE stmt_uq_sales_quotation FROM @sql_uq_sales_quotation;
EXECUTE stmt_uq_sales_quotation;
DEALLOCATE PREPARE stmt_uq_sales_quotation;
