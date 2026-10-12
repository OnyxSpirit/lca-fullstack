CREATE TABLE document_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_document_category_code (code),
  UNIQUE KEY uk_document_category_name (name),
  INDEX idx_document_category_active (is_active,display_order,name),
  CONSTRAINT fk_document_category_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_document_category_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE document_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(120) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_document_type_code (code),
  UNIQUE KEY uk_document_type_category_name (category_id,name),
  INDEX idx_document_type_active (category_id,is_active,display_order,name),
  CONSTRAINT fk_document_type_category FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_document_type_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_document_type_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE documents
  MODIFY entity_type VARCHAR(80) NULL,
  MODIFY entity_id BIGINT UNSIGNED NULL,
  ADD COLUMN title VARCHAR(190) NULL AFTER source_key,
  ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER title,
  ADD COLUMN document_type_id BIGINT UNSIGNED NULL AFTER document_type,
  ADD COLUMN reference VARCHAR(150) NULL AFTER document_type_id,
  ADD COLUMN document_date DATE NULL AFTER reference,
  ADD COLUMN description TEXT NULL AFTER expires_at,
  ADD COLUMN agency_id BIGINT UNSIGNED NULL AFTER entity_id,
  ADD COLUMN concession_id BIGINT UNSIGNED NULL AFTER agency_id,
  ADD INDEX idx_documents_category_type (category_id,document_type_id),
  ADD INDEX idx_documents_attachment (entity_type,entity_id),
  ADD INDEX idx_documents_agency (agency_id,created_at),
  ADD CONSTRAINT fk_documents_category FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_documents_type FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_documents_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_documents_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT;

INSERT INTO document_categories(code,name,display_order) VALUES
('CLIENTS_IDENTITY','Clients & Identité',10),('VEHICLES','Véhicules',20),('SALES','Ventes & Commercial',30),
('WORKSHOP','SAV & Atelier',40),('WARRANTY','Garantie constructeur',50),('PURCHASES','Achats & Fournisseurs',60),
('FINANCE','Comptabilité & Finance',70),('HR','RH & Personnel',80),('LEGAL','Juridique & Administration',90),
('OPERATIONS','Concession & Exploitation',100),('OTHER','Autres',110);

INSERT INTO document_types(category_id,code,name,display_order)
SELECT c.id,x.code,x.name,x.ord FROM document_categories c JOIN (
 SELECT 'CLIENTS_IDENTITY' cat,'IDENTITY_CARD' code,'Pièce d''identité' name,10 ord UNION ALL SELECT 'CLIENTS_IDENTITY','DRIVING_LICENSE','Permis de conduire',20 UNION ALL SELECT 'CLIENTS_IDENTITY','PROOF_ADDRESS','Justificatif de domicile',30 UNION ALL SELECT 'CLIENTS_IDENTITY','PROXY','Procuration',40 UNION ALL SELECT 'CLIENTS_IDENTITY','CUSTOMER_DOCUMENT','Document client',50
 UNION ALL SELECT 'VEHICLES','REGISTRATION_CERTIFICATE','Carte grise / certificat d''immatriculation',10 UNION ALL SELECT 'VEHICLES','TECHNICAL_INSPECTION','Contrôle technique',20 UNION ALL SELECT 'VEHICLES','CERTIFICATE_CONFORMITY','Certificat de conformité',30 UNION ALL SELECT 'VEHICLES','VEHICLE_INSURANCE','Assurance véhicule',40 UNION ALL SELECT 'VEHICLES','CUSTOMS_DOCUMENT','Document douanier',50 UNION ALL SELECT 'VEHICLES','IMPORT_DOCUMENT','Document d''importation',60 UNION ALL SELECT 'VEHICLES','VEHICLE_DOCUMENT','Document véhicule',70
 UNION ALL SELECT 'SALES','COMMERCIAL_QUOTE','Devis commercial',10 UNION ALL SELECT 'SALES','CUSTOMER_ORDER','Bon de commande client',20 UNION ALL SELECT 'SALES','SALE_CONTRACT','Contrat de vente',30 UNION ALL SELECT 'SALES','CUSTOMER_INVOICE','Facture client',40 UNION ALL SELECT 'SALES','PAYMENT_RECEIPT','Reçu de paiement',50 UNION ALL SELECT 'SALES','CUSTOMER_CREDIT_NOTE','Avoir client',60 UNION ALL SELECT 'SALES','DELIVERY_REPORT','Bon / PV de livraison',70
 UNION ALL SELECT 'WORKSHOP','REPAIR_ORDER','Ordre de réparation',10 UNION ALL SELECT 'WORKSHOP','DIAGNOSTIC','Diagnostic',20 UNION ALL SELECT 'WORKSHOP','WORKSHOP_ESTIMATE','Devis / chiffrage SAV',30 UNION ALL SELECT 'WORKSHOP','CUSTOMER_AUTHORIZATION','Autorisation client',40 UNION ALL SELECT 'WORKSHOP','INTERVENTION_SHEET','Fiche d''intervention',50 UNION ALL SELECT 'WORKSHOP','QUALITY_CONTROL','Contrôle qualité',60 UNION ALL SELECT 'WORKSHOP','RETURN_REPORT','PV de restitution',70 UNION ALL SELECT 'WORKSHOP','WORKSHOP_DOCUMENT','Document atelier',80
 UNION ALL SELECT 'WARRANTY','WARRANTY_AUTHORIZATION','Autorisation de prise en charge',10 UNION ALL SELECT 'WARRANTY','MANUFACTURER_DECISION','Décision constructeur',20 UNION ALL SELECT 'WARRANTY','WARRANTY_PROOF','Justificatif de garantie',30 UNION ALL SELECT 'WARRANTY','WARRANTY_REQUEST','Demande de garantie',40 UNION ALL SELECT 'WARRANTY','COVERAGE_DOCUMENT','Document de prise en charge',50 UNION ALL SELECT 'WARRANTY','MANUFACTURER_PROOF','Justificatif constructeur',60
 UNION ALL SELECT 'PURCHASES','SUPPLIER_QUOTE','Devis fournisseur',10 UNION ALL SELECT 'PURCHASES','SUPPLIER_ORDER','Bon de commande fournisseur',20 UNION ALL SELECT 'PURCHASES','SUPPLIER_INVOICE','Facture fournisseur',30 UNION ALL SELECT 'PURCHASES','SUPPLIER_CREDIT_NOTE','Avoir fournisseur',40 UNION ALL SELECT 'PURCHASES','SUPPLIER_DELIVERY_NOTE','Bon de livraison fournisseur',50 UNION ALL SELECT 'PURCHASES','SUPPLIER_CONTRACT','Contrat fournisseur',60
 UNION ALL SELECT 'FINANCE','EXPENSE_PROOF','Justificatif de dépense',10 UNION ALL SELECT 'FINANCE','BANK_STATEMENT','Relevé bancaire',20 UNION ALL SELECT 'FINANCE','PAYMENT_PROOF','Preuve de paiement',30 UNION ALL SELECT 'FINANCE','ACCOUNTING_DOCUMENT','Pièce comptable',40 UNION ALL SELECT 'FINANCE','EXPENSE_REPORT','Note de frais',50 UNION ALL SELECT 'FINANCE','TAX_DOCUMENT','Document fiscal',60
 UNION ALL SELECT 'HR','EMPLOYMENT_CONTRACT','Contrat de travail',10 UNION ALL SELECT 'HR','EMPLOYEE_IDENTITY','Pièce d''identité employé',20 UNION ALL SELECT 'HR','CV','CV',30 UNION ALL SELECT 'HR','DIPLOMA','Diplôme / certificat',40 UNION ALL SELECT 'HR','PAYSLIP','Bulletin de paie',50 UNION ALL SELECT 'HR','CERTIFICATE','Attestation',60 UNION ALL SELECT 'HR','HR_ADMIN_DOCUMENT','Document administratif RH',70
 UNION ALL SELECT 'LEGAL','CONTRACT','Contrat',10 UNION ALL SELECT 'LEGAL','AGREEMENT','Convention',20 UNION ALL SELECT 'LEGAL','ADMIN_MAIL','Courrier administratif',30 UNION ALL SELECT 'LEGAL','LICENSE','Agrément / licence',40 UNION ALL SELECT 'LEGAL','ADMIN_CERTIFICATE','Attestation administrative',50 UNION ALL SELECT 'LEGAL','LEGAL_DOCUMENT','Document juridique',60 UNION ALL SELECT 'LEGAL','MINUTES','Procès-verbal',70
 UNION ALL SELECT 'OPERATIONS','ELECTRICITY_INVOICE','Facture électricité',10 UNION ALL SELECT 'OPERATIONS','WATER_INVOICE','Facture eau',20 UNION ALL SELECT 'OPERATIONS','TELECOM_INVOICE','Facture Internet / télécom',30 UNION ALL SELECT 'OPERATIONS','LEASE','Bail / location',40 UNION ALL SELECT 'OPERATIONS','PREMISES_INSURANCE','Assurance des locaux',50 UNION ALL SELECT 'OPERATIONS','MAINTENANCE','Maintenance',60 UNION ALL SELECT 'OPERATIONS','SECURITY','Sécurité',70 UNION ALL SELECT 'OPERATIONS','SUPPLIES','Fournitures',80 UNION ALL SELECT 'OPERATIONS','OPERATIONS_DOCUMENT','Document d''exploitation',90
 UNION ALL SELECT 'OTHER','OTHER_DOCUMENT','Autre document',10
) x ON x.cat=c.code;

UPDATE documents d
LEFT JOIN document_types t ON t.name=d.document_type
LEFT JOIN document_categories c ON c.id=t.category_id
SET d.title=COALESCE(NULLIF(d.file_name,''),d.document_type),d.document_type_id=t.id,d.category_id=c.id;

UPDATE documents d
LEFT JOIN customers c ON d.entity_type='customer' AND c.id=d.entity_id
LEFT JOIN vehicles v ON d.entity_type='vehicle' AND v.id=d.entity_id
LEFT JOIN sales s ON d.entity_type='sale' AND s.id=d.entity_id
LEFT JOIN invoices i ON d.entity_type='invoice' AND i.id=d.entity_id
LEFT JOIN repair_orders ro ON d.entity_type='repair_order' AND ro.id=d.entity_id
LEFT JOIN deliveries dl ON d.entity_type='delivery' AND dl.id=d.entity_id
SET d.agency_id=COALESCE(c.agency_id,v.agency_id,s.agency_id,i.agency_id,ro.agency_id,dl.agency_id),
    d.concession_id=(SELECT a.concession_id FROM agencies a WHERE a.id=COALESCE(c.agency_id,v.agency_id,s.agency_id,i.agency_id,ro.agency_id,dl.agency_id))
WHERE d.agency_id IS NULL;
