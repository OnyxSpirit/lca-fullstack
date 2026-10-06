CREATE TABLE budget_expense_disbursements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_expense_id BIGINT UNSIGNED NOT NULL,
  treasury_account_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  treasury_category_id BIGINT UNSIGNED NOT NULL,
  payment_method_id BIGINT UNSIGNED NULL,
  beneficiary VARCHAR(255) NOT NULL,
  handed_to VARCHAR(255) NULL,
  reference VARCHAR(150) NULL,
  description VARCHAR(1000) NOT NULL,
  value_date DATE NOT NULL,
  client_request_id CHAR(36) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_budget_expense_disbursement_request (created_by,client_request_id),
  KEY idx_budget_expense_disbursement_expense (budget_expense_id,created_at,id),
  KEY idx_budget_expense_disbursement_account (treasury_account_id,value_date,id),
  CONSTRAINT chk_budget_expense_disbursement_amount CHECK (amount > 0),
  CONSTRAINT fk_budget_expense_disbursement_expense FOREIGN KEY (budget_expense_id) REFERENCES budget_expenses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_expense_disbursement_account FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_expense_disbursement_category FOREIGN KEY (treasury_category_id) REFERENCES treasury_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_expense_disbursement_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_expense_disbursement_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('hr','create','hr.expense.disburse','Décaisser une dépense','RH & Administration','Créer un décaissement Treasury relié à une dépense budgétaire autorisée',TRUE);

INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code='hr.expense.disburse'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE;
