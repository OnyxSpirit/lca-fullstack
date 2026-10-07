-- Lot 8: catalogue concession, snapshots immuables et exécution traçable.
-- Les tables historiques restent intactes; leur état réel est recopié sans inventer de validation.

CREATE TABLE delivery_checklist_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concession_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description VARCHAR(1000) NULL,
  sort_order INT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_checklist_category_code (concession_id,code),
  UNIQUE KEY uq_delivery_checklist_category_order (concession_id,sort_order),
  INDEX idx_delivery_checklist_category_active (concession_id,is_active,sort_order),
  CONSTRAINT fk_delivery_checklist_category_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_checklist_category_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_checklist_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(1000) NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_checklist_item_code (category_id,code),
  UNIQUE KEY uq_delivery_checklist_item_order (category_id,sort_order),
  INDEX idx_delivery_checklist_item_active (category_id,is_active,sort_order),
  CONSTRAINT fk_delivery_checklist_item_category FOREIGN KEY (category_id) REFERENCES delivery_checklist_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_checklist_item_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_checklist_category_instances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL,
  source_category_id BIGINT UNSIGNED NULL,
  code_snapshot VARCHAR(80) NOT NULL,
  name_snapshot VARCHAR(180) NOT NULL,
  description_snapshot VARCHAR(1000) NULL,
  sort_order_snapshot INT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_checklist_category_instance (delivery_id,code_snapshot),
  UNIQUE KEY uq_delivery_checklist_category_instance_order (delivery_id,sort_order_snapshot),
  INDEX idx_delivery_checklist_category_instance_delivery (delivery_id,sort_order_snapshot),
  CONSTRAINT fk_delivery_checklist_category_instance_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_checklist_category_instance_source FOREIGN KEY (source_category_id) REFERENCES delivery_checklist_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_delivery_checklist_category_instance_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_checklist_item_instances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_instance_id BIGINT UNSIGNED NOT NULL,
  source_item_id BIGINT UNSIGNED NULL,
  legacy_checklist_id BIGINT UNSIGNED NULL,
  legacy_document_id BIGINT UNSIGNED NULL,
  code_snapshot VARCHAR(80) NOT NULL,
  name_snapshot VARCHAR(200) NOT NULL,
  description_snapshot VARCHAR(1000) NULL,
  is_mandatory_snapshot BOOLEAN NOT NULL,
  sort_order_snapshot INT UNSIGNED NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by BIGINT UNSIGNED NULL,
  completed_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_checklist_item_instance (category_instance_id,code_snapshot),
  UNIQUE KEY uq_delivery_checklist_item_instance_order (category_instance_id,sort_order_snapshot),
  UNIQUE KEY uq_delivery_checklist_legacy_item (legacy_checklist_id),
  UNIQUE KEY uq_delivery_checklist_legacy_document (legacy_document_id),
  INDEX idx_delivery_checklist_item_instance_progress (category_instance_id,is_mandatory_snapshot,is_completed,sort_order_snapshot),
  CONSTRAINT fk_delivery_checklist_item_instance_category FOREIGN KEY (category_instance_id) REFERENCES delivery_checklist_category_instances(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_checklist_item_instance_source FOREIGN KEY (source_item_id) REFERENCES delivery_checklist_items(id) ON DELETE SET NULL,
  CONSTRAINT fk_delivery_checklist_item_instance_legacy FOREIGN KEY (legacy_checklist_id) REFERENCES delivery_checklists(id) ON DELETE SET NULL,
  CONSTRAINT fk_delivery_checklist_item_instance_document FOREIGN KEY (legacy_document_id) REFERENCES delivery_documents(id) ON DELETE SET NULL,
  CONSTRAINT fk_delivery_checklist_item_instance_completed_by FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_delivery_checklist_item_completion CHECK (is_completed=FALSE OR completed_at IS NOT NULL)
) ENGINE=InnoDB;

INSERT INTO delivery_checklist_categories(concession_id,code,name,description,sort_order,is_active)
SELECT c.id,x.code,x.name,x.description,x.sort_order,TRUE
FROM concessions c
JOIN (
  SELECT 'preparation' code,'Préparation du véhicule' name,'Préparation opérationnelle avant remise.' description,10 sort_order
  UNION ALL SELECT 'quality','Contrôle qualité','Contrôles qualité avant remise.',20
  UNION ALL SELECT 'documents','Documents administratifs','Documents et éléments administratifs à remettre.',30
  UNION ALL SELECT 'handover','Remise au client','Contrôles et explications lors de la remise.',40
) x
WHERE TRUE
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description);

INSERT INTO delivery_checklist_items(category_id,code,name,is_mandatory,sort_order,is_active)
SELECT category.id,COALESCE(template.template_code,CONCAT('LEGACY_',template.id)),template.item_name,template.is_required,
       ROW_NUMBER() OVER(PARTITION BY category.id ORDER BY template.sort_order,template.id)*10,template.is_active
FROM delivery_checklist_categories category
JOIN delivery_checklist_templates template ON template.category=category.code
LEFT JOIN agencies template_agency ON template_agency.id=template.agency_id
WHERE template.agency_id IS NULL OR template_agency.concession_id=category.concession_id
ON DUPLICATE KEY UPDATE name=VALUES(name),is_mandatory=VALUES(is_mandatory),is_active=VALUES(is_active);

INSERT INTO delivery_checklist_category_instances(delivery_id,source_category_id,code_snapshot,name_snapshot,description_snapshot,sort_order_snapshot,created_by,created_at)
SELECT present.delivery_id,category.id,present.category,
       COALESCE(category.name,CASE present.category WHEN 'preparation' THEN 'Préparation du véhicule' WHEN 'quality' THEN 'Contrôle qualité' WHEN 'documents' THEN 'Documents administratifs' ELSE 'Remise au client' END),
       category.description,CASE present.category WHEN 'preparation' THEN 10 WHEN 'quality' THEN 20 WHEN 'documents' THEN 30 ELSE 40 END,
       delivery.created_by,COALESCE(delivery.prepared_at,delivery.created_at)
FROM (
  SELECT delivery_id,category FROM delivery_checklists
  UNION
  SELECT delivery_id,'documents' category FROM delivery_documents
) present
JOIN deliveries delivery ON delivery.id=present.delivery_id
JOIN agencies agency ON agency.id=delivery.agency_id
LEFT JOIN delivery_checklist_categories category ON category.concession_id=agency.concession_id AND category.code=present.category
ON DUPLICATE KEY UPDATE delivery_id=VALUES(delivery_id);

INSERT INTO delivery_checklist_item_instances(category_instance_id,source_item_id,legacy_checklist_id,code_snapshot,name_snapshot,is_mandatory_snapshot,sort_order_snapshot,is_completed,completed_by,completed_at,notes,created_at)
SELECT category_instance.id,item.id,legacy.id,COALESCE(template.template_code,CONCAT('LEGACY_CHECKLIST_',legacy.id)),legacy.item_name,legacy.is_required,
       ROW_NUMBER() OVER(PARTITION BY category_instance.id ORDER BY legacy.sort_order,legacy.id)*10,
       legacy.is_completed,legacy.completed_by,legacy.completed_at,legacy.notes,category_instance.created_at
FROM delivery_checklists legacy
JOIN delivery_checklist_category_instances category_instance ON category_instance.delivery_id=legacy.delivery_id AND category_instance.code_snapshot=legacy.category
LEFT JOIN delivery_checklist_templates template ON template.id=legacy.template_id
LEFT JOIN delivery_checklist_items item ON item.category_id=category_instance.source_category_id AND item.code=template.template_code
ON DUPLICATE KEY UPDATE legacy_checklist_id=VALUES(legacy_checklist_id);

INSERT INTO delivery_checklist_item_instances(category_instance_id,source_item_id,legacy_document_id,code_snapshot,name_snapshot,is_mandatory_snapshot,sort_order_snapshot,is_completed,completed_by,completed_at,created_at)
SELECT category_instance.id,item.id,document.id,CONCAT('LEGACY_DOCUMENT_',document.id),document.document_name,document.is_required,
       COALESCE(existing.max_order,0)+ROW_NUMBER() OVER(PARTITION BY category_instance.id ORDER BY document.id)*10,
       document.received,document.received_by,document.received_at,category_instance.created_at
FROM delivery_documents document
JOIN delivery_checklist_category_instances category_instance ON category_instance.delivery_id=document.delivery_id AND category_instance.code_snapshot='documents'
LEFT JOIN delivery_checklist_templates template ON template.category='documents' AND template.item_name=document.document_name
LEFT JOIN delivery_checklist_items item ON item.category_id=category_instance.source_category_id AND item.code=template.template_code
LEFT JOIN (
  SELECT category_instance_id,MAX(sort_order_snapshot) max_order
  FROM delivery_checklist_item_instances
  GROUP BY category_instance_id
) existing ON existing.category_instance_id=category_instance.id
ON DUPLICATE KEY UPDATE legacy_document_id=VALUES(legacy_document_id);

INSERT INTO permissions(module,action,code,label,name,group_name,category,description,is_active) VALUES
('delivery','view','delivery.checklist.config.view','Voir la configuration checklist livraison','Voir la configuration checklist livraison','Livraisons','Livraisons','Consulter les catégories et items configurables de la concession',TRUE),
('delivery','manage','delivery.checklist.config.manage','Gérer la configuration checklist livraison','Gérer la configuration checklist livraison','Livraisons','Livraisons','Créer, modifier, activer et ordonner les catégories et items de la concession',TRUE)
ON DUPLICATE KEY UPDATE label=VALUES(label),name=VALUES(name),group_name=VALUES(group_name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT role.id,permission.id,'GLOBAL' FROM roles role JOIN permissions permission ON permission.code IN('delivery.checklist.config.view','delivery.checklist.config.manage')
WHERE role.code='SUPER_ADMIN' AND role.is_system=TRUE
ON DUPLICATE KEY UPDATE scope='GLOBAL';
