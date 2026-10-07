-- Lot 11A : contrats RH historiques rattachés au dossier employé autonome.
CREATE TABLE employee_contract_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concession_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_contract_type_concession_code (concession_id,code),
  UNIQUE KEY uk_contract_type_concession_name (concession_id,name),
  KEY idx_contract_type_active (concession_id,is_active,name),
  CONSTRAINT fk_contract_type_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_contract_type_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contract_type_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE employee_contracts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_profile_id BIGINT UNSIGNED NOT NULL,
  concession_id BIGINT UNSIGNED NOT NULL,
  contract_type_id BIGINT UNSIGNED NOT NULL,
  type_code_snapshot VARCHAR(50) NOT NULL,
  type_name_snapshot VARCHAR(120) NOT NULL,
  reference VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  contractual_end_date DATE NULL,
  effective_end_date DATE NULL,
  status ENUM('DRAFT','ACTIVE','ENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  end_reason VARCHAR(1000) NULL,
  cancellation_reason VARCHAR(1000) NULL,
  previous_contract_id BIGINT UNSIGNED NULL,
  activated_at DATETIME NULL,
  ended_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_contract_concession_reference (concession_id,reference),
  UNIQUE KEY uk_contract_previous (previous_contract_id),
  KEY idx_contract_employee_period (employee_profile_id,start_date,contractual_end_date),
  KEY idx_contract_employee_status (employee_profile_id,status,start_date),
  KEY idx_contract_type (contract_type_id,status),
  CONSTRAINT chk_contract_dates CHECK (contractual_end_date IS NULL OR contractual_end_date >= start_date),
  CONSTRAINT chk_contract_effective_end CHECK (effective_end_date IS NULL OR effective_end_date >= start_date),
  CONSTRAINT chk_contract_transition_data CHECK (
    (status='DRAFT' AND activated_at IS NULL AND ended_at IS NULL AND cancelled_at IS NULL) OR
    (status='ACTIVE' AND activated_at IS NOT NULL AND ended_at IS NULL AND cancelled_at IS NULL) OR
    (status='ENDED' AND activated_at IS NOT NULL AND ended_at IS NOT NULL AND effective_end_date IS NOT NULL AND cancelled_at IS NULL) OR
    (status='CANCELLED' AND cancelled_at IS NOT NULL AND ended_at IS NULL)
  ),
  CONSTRAINT fk_contract_employee FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_contract_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_contract_type FOREIGN KEY (contract_type_id) REFERENCES employee_contract_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_contract_previous FOREIGN KEY (previous_contract_id) REFERENCES employee_contracts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contract_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_contract_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','view','hr.contract.view','Voir les contrats employés','RH & Administration','Consulter les contrats des employés dans son périmètre',TRUE),
('hr','manage','hr.contract.manage','Gérer les contrats employés','RH & Administration','Créer et faire évoluer les contrats des employés dans son périmètre',TRUE),
('hr','manage','hr.contract.type.manage','Gérer les types de contrat','RH & Administration','Configurer les types de contrat de la concession',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
  AND p.code IN ('hr.contract.view','hr.contract.manage','hr.contract.type.manage')
ON DUPLICATE KEY UPDATE scope='GLOBAL';
