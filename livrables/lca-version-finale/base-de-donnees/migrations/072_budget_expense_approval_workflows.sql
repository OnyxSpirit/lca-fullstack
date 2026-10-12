ALTER TABLE budgets
  MODIFY status ENUM('draft','submitted','active','rejected','closed','cancelled') NOT NULL DEFAULT 'draft',
  ADD COLUMN submitted_by BIGINT UNSIGNED NULL AFTER updated_by,
  ADD COLUMN submitted_at DATETIME NULL AFTER submitted_by,
  ADD COLUMN decided_by BIGINT UNSIGNED NULL AFTER submitted_at,
  ADD COLUMN decided_at DATETIME NULL AFTER decided_by,
  ADD COLUMN decision_reason VARCHAR(500) NULL AFTER decided_at,
  ADD COLUMN is_legacy BOOLEAN NOT NULL DEFAULT FALSE AFTER decision_reason,
  ADD CONSTRAINT fk_budget_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_budget_decider FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL;

UPDATE budgets SET is_legacy=TRUE WHERE status<>'draft';

ALTER TABLE budget_expenses
  ADD COLUMN approval_status ENUM('draft','submitted','approved','rejected','cancelled') NOT NULL DEFAULT 'draft' AFTER reference,
  ADD COLUMN submitted_by BIGINT UNSIGNED NULL AFTER created_by,
  ADD COLUMN submitted_at DATETIME NULL AFTER submitted_by,
  ADD COLUMN decided_by BIGINT UNSIGNED NULL AFTER submitted_at,
  ADD COLUMN decided_at DATETIME NULL AFTER decided_by,
  ADD COLUMN decision_reason VARCHAR(500) NULL AFTER decided_at,
  ADD COLUMN is_legacy BOOLEAN NOT NULL DEFAULT FALSE AFTER decision_reason,
  ADD INDEX idx_budget_expense_approval (budget_id,approval_status,expense_date),
  ADD CONSTRAINT fk_budget_expense_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_budget_expense_decider FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL;

UPDATE budget_expenses SET approval_status='approved',is_legacy=TRUE;

CREATE TABLE budget_approval_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('budget','expense') NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  action ENUM('created','submitted','approved','rejected','reopened','cancelled','closed') NOT NULL,
  old_status VARCHAR(30) NULL,
  new_status VARCHAR(30) NOT NULL,
  reason VARCHAR(500) NULL,
  actor_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_budget_approval_entity (entity_type,entity_id,created_at,id),
  CONSTRAINT fk_budget_approval_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','submit','hr.budget.submit','Soumettre un budget','RH & Administration','Soumettre un budget brouillon de son périmètre',TRUE),
('hr','approve','hr.budget.approve','Approuver un budget','RH & Administration','Approuver ou rejeter un budget soumis de son périmètre',TRUE),
('hr','submit','hr.expense.submit','Soumettre une dépense','RH & Administration','Soumettre une dépense budgétaire brouillon de son périmètre',TRUE),
('hr','approve','hr.expense.approve','Approuver une dépense','RH & Administration','Approuver ou rejeter une dépense soumise de son périmètre',TRUE),
('hr','view','hr.approval.history.view','Voir les validations budgétaires','RH & Administration','Consulter l’historique des validations de son périmètre',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN(
  'hr.budget.submit','hr.budget.approve','hr.expense.submit','hr.expense.approve','hr.approval.history.view'
) WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE;
