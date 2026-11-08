-- Sections opérationnelles SAV : caisse de transit et permissions dédiées.
-- Les factures et règlements restent dans Billing ; cette table ne représente
-- que le mouvement interne des fonds SAV vers la comptabilité.
CREATE TABLE sav_transit_transfers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transfer_number VARCHAR(80) NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  fund_nature ENUM('CASH','ELECTRONIC','CENTRAL_ACCOUNT') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  status ENUM('EN_ATTENTE_RECEPTION','CONFIRME','REFUSE','ANNULE') NOT NULL DEFAULT 'EN_ATTENTE_RECEPTION',
  reference VARCHAR(150) NULL,
  notes TEXT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  initiated_by BIGINT UNSIGNED NOT NULL,
  initiated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by BIGINT UNSIGNED NULL,
  decided_at DATETIME NULL,
  decision_reason VARCHAR(500) NULL,
  confirmed_treasury_transfer_id BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_sav_transit_number(transfer_number),
  UNIQUE KEY uq_sav_transit_key(agency_id,idempotency_key),
  KEY idx_sav_transit_scope(agency_id,status,initiated_at),
  CONSTRAINT chk_sav_transit_amount CHECK(amount>0),
  CONSTRAINT fk_sav_transit_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sav_transit_initiator FOREIGN KEY(initiated_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sav_transit_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sav_transit_treasury FOREIGN KEY(confirmed_treasury_transfer_id) REFERENCES treasury_transfers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('service','view','service.billing.view','Voir la facturation SAV','SAV & Atelier','Consulter les factures et créances issues des OR',TRUE),
('service','create','service.billing.collect','Encaisser une facture SAV','SAV & Atelier','Enregistrer des règlements depuis la section Facturation SAV',TRUE),
('service','view','service.transit.view','Voir la caisse de transit SAV','SAV & Atelier','Consulter les fonds et transferts SAV de son périmètre',TRUE),
('service','create','service.transit.initiate','Initier un transfert SAV','SAV & Atelier','Engager des fonds disponibles vers la comptabilité',TRUE),
('service','approve','service.transit.confirm','Confirmer une réception comptable SAV','SAV & Atelier','Confirmer explicitement les fonds reçus par la comptabilité',TRUE),
('service','approve','service.transit.resolve','Traiter un refus ou une annulation SAV','SAV & Atelier','Refuser ou annuler un transfert avec justification',TRUE),
('service','view','service.journal.view','Voir le journal des opérations SAV','SAV & Atelier','Consulter la chronologie métier et financière du SAV',TRUE),
('service','view','service.reporting.view','Voir le reporting SAV','SAV & Atelier','Consulter les indicateurs persistés du SAV',TRUE),
('service','export','service.reporting.export','Exporter le reporting SAV','SAV & Atelier','Exporter les données du reporting SAV',TRUE),
('service','update','service.order.correct','Corriger exceptionnellement un OR','SAV & Atelier','Effectuer une correction motivée, permissionnée et auditée',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN(
 'service.billing.view','service.billing.collect','service.transit.view','service.transit.initiate',
 'service.transit.confirm','service.transit.resolve','service.journal.view','service.reporting.view',
 'service.reporting.export','service.order.correct'
) WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
