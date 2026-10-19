-- B.3.4.2.3 LOT 4 : contrats prestataires, échéanciers, exigences GED et permissions.
CREATE TABLE provider_contracts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_profile_id BIGINT UNSIGNED NOT NULL,
  provider_assignment_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  concession_id BIGINT UNSIGNED NOT NULL,
  reference VARCHAR(100) NOT NULL,
  service_subject VARCHAR(190) NOT NULL,
  description TEXT NULL,
  start_date DATE NOT NULL,
  contractual_end_date DATE NULL,
  effective_end_date DATE NULL,
  compensation_mode ENUM('PERIODIC','FIXED','INSTALLMENTS') NOT NULL,
  periodicity ENUM('MONTHLY','QUARTERLY','YEARLY') NULL,
  contractual_amount DECIMAL(15,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'XAF',
  payment_terms TEXT NULL,
  special_conditions TEXT NULL,
  status ENUM('DRAFT','ACTIVE','SUSPENDED','ENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  activated_at DATETIME NULL,
  activated_by BIGINT UNSIGNED NULL,
  suspended_at DATETIME NULL,
  suspended_by BIGINT UNSIGNED NULL,
  suspension_reason VARCHAR(1000) NULL,
  ended_at DATETIME NULL,
  ended_by BIGINT UNSIGNED NULL,
  end_reason VARCHAR(1000) NULL,
  cancelled_at DATETIME NULL,
  cancelled_by BIGINT UNSIGNED NULL,
  cancellation_reason VARCHAR(1000) NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider_contract_reference (concession_id,reference),
  KEY idx_provider_contract_profile (provider_profile_id,status,start_date),
  KEY idx_provider_contract_scope (agency_id,status,start_date),
  KEY idx_provider_contract_assignment (provider_assignment_id,status),
  CONSTRAINT chk_provider_contract_dates CHECK (contractual_end_date IS NULL OR contractual_end_date>=start_date),
  CONSTRAINT chk_provider_contract_amount CHECK (contractual_amount>0 AND currency='XAF'),
  CONSTRAINT chk_provider_contract_periodicity CHECK ((compensation_mode='PERIODIC' AND periodicity IS NOT NULL) OR (compensation_mode<>'PERIODIC' AND periodicity IS NULL)),
  CONSTRAINT chk_provider_contract_suspension CHECK ((status='SUSPENDED' AND suspended_at IS NOT NULL AND suspended_by IS NOT NULL AND suspension_reason IS NOT NULL) OR (status<>'SUSPENDED' AND suspended_at IS NULL AND suspended_by IS NULL AND suspension_reason IS NULL)),
  CONSTRAINT fk_provider_contract_profile FOREIGN KEY (provider_profile_id) REFERENCES provider_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_contract_assignment FOREIGN KEY (provider_assignment_id) REFERENCES provider_agency_assignments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_contract_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_contract_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_contract_activator FOREIGN KEY (activated_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_provider_contract_suspender FOREIGN KEY (suspended_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_provider_contract_ender FOREIGN KEY (ended_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_provider_contract_canceller FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_provider_contract_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_contract_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE provider_contract_installments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_contract_id BIGINT UNSIGNED NOT NULL,
  installment_order SMALLINT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description VARCHAR(500) NULL,
  used_at DATETIME NULL,
  used_reference_type VARCHAR(80) NULL,
  used_reference_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider_contract_installment_order (provider_contract_id,installment_order),
  KEY idx_provider_contract_installment_due (due_date,used_at),
  CONSTRAINT chk_provider_contract_installment_amount CHECK (amount>0),
  CONSTRAINT chk_provider_contract_installment_usage CHECK ((used_at IS NULL AND used_reference_type IS NULL AND used_reference_id IS NULL) OR (used_at IS NOT NULL AND used_reference_type IS NOT NULL AND used_reference_id IS NOT NULL)),
  CONSTRAINT fk_provider_contract_installment_contract FOREIGN KEY (provider_contract_id) REFERENCES provider_contracts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_contract_installment_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_contract_installment_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE provider_contract_document_requirements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_contract_id BIGINT UNSIGNED NOT NULL,
  document_type_id BIGINT UNSIGNED NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  required_stage ENUM('ACTIVATION','PAYMENT') NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider_contract_document_requirement (provider_contract_id,document_type_id,required_stage),
  CONSTRAINT fk_provider_contract_requirement_contract FOREIGN KEY (provider_contract_id) REFERENCES provider_contracts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_contract_requirement_type FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_contract_requirement_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_contract_requirement_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE provider_contract_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_contract_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status VARCHAR(30) NULL,
  reason VARCHAR(1000) NULL,
  snapshot JSON NULL,
  performed_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_provider_contract_history (provider_contract_id,created_at,id),
  CONSTRAINT fk_provider_contract_history_contract FOREIGN KEY (provider_contract_id) REFERENCES provider_contracts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_provider_contract_history_actor FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('hr','view','hr.provider.contract.view','Consulter les contrats prestataires','Consulter les contrats prestataires','RH & Administration','Consulter les engagements contractuels prestataires dans le périmètre attribué',TRUE),
('hr','manage','hr.provider.contract.manage','Gérer les contrats prestataires','Gérer les contrats prestataires','RH & Administration','Créer et piloter les contrats prestataires dans le périmètre attribué',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
AND p.code IN ('hr.provider.contract.view','hr.provider.contract.manage')
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
