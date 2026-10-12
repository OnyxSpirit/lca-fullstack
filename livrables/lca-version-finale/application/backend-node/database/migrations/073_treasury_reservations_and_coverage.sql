CREATE TABLE treasury_reservations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT UNSIGNED NOT NULL,
  budget_expense_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NULL,
  concession_id BIGINT UNSIGNED NOT NULL,
  currency_code CHAR(3) NOT NULL,
  reference VARCHAR(150) NULL,
  initial_amount DECIMAL(18,2) NOT NULL,
  active_amount DECIMAL(18,2) NOT NULL,
  status ENUM('ACTIVE','RELEASED','CONSUMED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  reason VARCHAR(500) NOT NULL,
  client_request_id CHAR(36) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_reservation_request (created_by,client_request_id),
  INDEX idx_treasury_reservation_account (account_id,status,active_amount),
  INDEX idx_treasury_reservation_expense (budget_expense_id,status,active_amount),
  CONSTRAINT chk_treasury_reservation_amount CHECK (initial_amount > 0 AND active_amount >= 0 AND active_amount <= initial_amount),
  CONSTRAINT fk_treasury_reservation_account FOREIGN KEY (account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_reservation_expense FOREIGN KEY (budget_expense_id) REFERENCES budget_expenses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_reservation_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_reservation_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_reservation_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE treasury_reservation_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('CREATED','ADJUSTED','RELEASED','CONSUMED','CANCELLED') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  amount_before DECIMAL(18,2) NOT NULL,
  amount_after DECIMAL(18,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  budget_expense_disbursement_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_treasury_reservation_event (reservation_id,created_at,id),
  CONSTRAINT chk_treasury_reservation_event_amounts CHECK (amount >= 0 AND amount_before >= 0 AND amount_after >= 0),
  CONSTRAINT fk_treasury_reservation_event_reservation FOREIGN KEY (reservation_id) REFERENCES treasury_reservations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_reservation_event_disbursement FOREIGN KEY (budget_expense_disbursement_id) REFERENCES budget_expense_disbursements(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_reservation_event_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('treasury','view','treasury.coverage.view','Voir la couverture financière','Comptabilité & Trésorerie','Consulter liquidités, engagements et couverture par devise et périmètre',TRUE),
('treasury','view','treasury.reservation.view','Voir les réservations','Comptabilité & Trésorerie','Consulter les réservations de liquidités du périmètre',TRUE),
('treasury','create','treasury.reservation.create','Créer une réservation','Comptabilité & Trésorerie','Réserver des liquidités pour une dépense approuvée',TRUE),
('treasury','update','treasury.reservation.release','Libérer une réservation','Comptabilité & Trésorerie','Libérer une réservation active avec motif',TRUE),
('treasury','update','treasury.reservation.adjust','Ajuster une réservation','Comptabilité & Trésorerie','Ajuster une réservation active dans les limites financières',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN(
 'treasury.coverage.view','treasury.reservation.view','treasury.reservation.create','treasury.reservation.release','treasury.reservation.adjust'
) WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
