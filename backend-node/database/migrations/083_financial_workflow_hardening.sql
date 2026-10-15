CREATE TABLE budget_fund_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reference VARCHAR(100) NULL,
  status ENUM('SUBMITTED','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
  requested_by BIGINT UNSIGNED NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by BIGINT UNSIGNED NULL,
  decided_at DATETIME NULL,
  decision_reason VARCHAR(500) NULL,
  fund_movement_id BIGINT UNSIGNED NULL,
  INDEX idx_budget_fund_request_budget (budget_id,status,requested_at,id),
  CONSTRAINT chk_budget_fund_request_amount CHECK (amount > 0),
  CONSTRAINT fk_budget_fund_request_budget FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_fund_request_requester FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_fund_request_decider FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_budget_fund_request_movement FOREIGN KEY (fund_movement_id) REFERENCES budget_fund_movements(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE treasury_reservations
  MODIFY status ENUM('DRAFT','SUBMITTED','ACTIVE','REJECTED','RELEASED','CONSUMED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN beneficiary VARCHAR(255) NULL AFTER reason,
  ADD COLUMN due_date DATE NULL AFTER beneficiary,
  ADD COLUMN submitted_by BIGINT UNSIGNED NULL AFTER created_by,
  ADD COLUMN submitted_at DATETIME NULL AFTER submitted_by,
  ADD COLUMN decided_by BIGINT UNSIGNED NULL AFTER submitted_at,
  ADD COLUMN decided_at DATETIME NULL AFTER decided_by,
  ADD COLUMN decision_reason VARCHAR(500) NULL AFTER decided_at,
  ADD COLUMN is_legacy BOOLEAN NOT NULL DEFAULT FALSE AFTER decision_reason,
  ADD CONSTRAINT fk_treasury_reservation_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_treasury_reservation_decider FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL;

UPDATE treasury_reservations SET is_legacy=TRUE WHERE status IN('ACTIVE','RELEASED','CONSUMED','CANCELLED');

ALTER TABLE treasury_reservation_events
  MODIFY event_type ENUM('CREATED','SUBMITTED','APPROVED','REJECTED','ADJUSTED','RELEASED','CONSUMED','CANCELLED','EXPIRED') NOT NULL;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','create','hr.budget.fund.request','Demander une rallonge budgétaire','RH & Administration','Soumettre une demande de rallonge sur un budget actif',TRUE),
('hr','view','hr.budget.fund.request.view','Voir les demandes de rallonge','RH & Administration','Consulter les demandes de rallonge de son périmètre',TRUE),
('hr','approve','hr.budget.fund.approve','Approuver une rallonge budgétaire','RH & Administration','Approuver ou rejeter une demande de rallonge de son périmètre',TRUE),
('treasury','submit','treasury.reservation.submit','Soumettre une réservation','Comptabilité & Trésorerie','Soumettre une réservation brouillon',TRUE),
('treasury','approve','treasury.reservation.approve','Approuver une réservation','Comptabilité & Trésorerie','Approuver ou rejeter une réservation soumise',TRUE),
('treasury','update','treasury.reservation.cancel','Annuler une demande de réservation','Comptabilité & Trésorerie','Annuler une réservation non active',TRUE),
('treasury','update','treasury.reservation.expire','Expirer une réservation','Comptabilité & Trésorerie','Expirer explicitement le reliquat actif',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);
