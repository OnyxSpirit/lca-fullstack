-- LCA ERP — baseline MySQL 8, état fonctionnel consolidé au niveau 066.
-- À exécuter exclusivement sur une base vide. Le runner refuse toute base ambiguë.
SET NAMES utf8mb4;

CREATE TABLE schema_migrations (
    version INT UNSIGNED PRIMARY KEY,
    name VARCHAR(190) NOT NULL UNIQUE,
    checksum CHAR(64) NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE groups_company (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE concessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    legal_name VARCHAR(200) NULL,
    tax_identifier VARCHAR(100) NULL,
    rccm VARCHAR(190) NULL,
    rib VARCHAR(500) NULL,
    website VARCHAR(500) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'XAF',
    timezone VARCHAR(80) NOT NULL DEFAULT 'Africa/Brazzaville',
    document_logo LONGBLOB NULL,
    document_logo_mime VARCHAR(40) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_concession_group
        FOREIGN KEY (group_id) REFERENCES groups_company(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE agencies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concession_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_agency_concession
        FOREIGN KEY (concession_id) REFERENCES concessions(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE departments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agency_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_department_agency_code (agency_id, code),
    CONSTRAINT fk_department_agency
        FOREIGN KEY (agency_id) REFERENCES agencies(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. UTILISATEURS / RBAC
-- ============================================================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_id BIGINT UNSIGNED NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    phone VARCHAR(50) NULL,
    password_hash VARCHAR(255) NOT NULL,
    job_title VARCHAR(120) NULL,
    avatar_path VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_agency_active (agency_id,is_active),
    CONSTRAINT fk_user_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_user_agency
        FOREIGN KEY (agency_id) REFERENCES agencies(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_refresh_user (user_id), INDEX idx_refresh_expiry (expires_at),
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(80) NOT NULL UNIQUE,
    description TEXT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_roles_active (is_active),
    CONSTRAINT fk_role_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(80) NOT NULL,
    action VARCHAR(40) NOT NULL,
    code VARCHAR(150) NOT NULL UNIQUE,
    label VARCHAR(150) NULL,
    name VARCHAR(150) NULL,
    group_name VARCHAR(80) NULL,
    category VARCHAR(80) NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_permissions_group (group_name,is_active)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    scope ENUM('OWN','AGENCY','CONCESSION','GLOBAL') NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_perm_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_role_perm_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_role_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_role_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2B. RH & ADMINISTRATION
-- ============================================================

CREATE TABLE employee_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL UNIQUE,
    concession_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(50) NULL,
    employee_number VARCHAR(50) NOT NULL UNIQUE,
    position_title VARCHAR(120) NULL,
    hire_date DATE NOT NULL,
    employment_status ENUM('active','inactive','departed') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_status (employment_status),
    INDEX idx_employee_concession_status (concession_id,employment_status),
    INDEX idx_employee_agency_status (agency_id,employment_status),
    INDEX idx_employee_identity (last_name,first_name),
    CONSTRAINT fk_employee_user_optional FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_employee_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_employee_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_employee_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_employee_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE salary_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_profile_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    effective_date DATE NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_salary_employee_effective (employee_profile_id,effective_date),
    INDEX idx_salary_effective (effective_date),
    CONSTRAINT chk_salary_positive CHECK (amount > 0),
    CONSTRAINT fk_salary_employee FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_salary_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE employee_leave_types (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concession_id BIGINT UNSIGNED NOT NULL, code VARCHAR(50) NOT NULL, label VARCHAR(120) NOT NULL, description VARCHAR(500) NULL,
 requires_document BOOLEAN NOT NULL DEFAULT FALSE, requires_approval BOOLEAN NOT NULL DEFAULT TRUE, is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uk_leave_type_concession_code(concession_id,code), UNIQUE KEY uk_leave_type_concession_label(concession_id,label), KEY idx_leave_type_active(concession_id,is_active,label),
 CONSTRAINT fk_leave_type_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT, CONSTRAINT fk_leave_type_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL, CONSTRAINT fk_leave_type_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE employee_leaves (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, employee_profile_id BIGINT UNSIGNED NOT NULL, concession_id BIGINT UNSIGNED NOT NULL, agency_id_snapshot BIGINT UNSIGNED NULL,
 leave_type_id BIGINT UNSIGNED NOT NULL, type_code_snapshot VARCHAR(50) NOT NULL, type_label_snapshot VARCHAR(120) NOT NULL, origin ENUM('EMPLOYEE_REQUEST','HR_ENTRY') NOT NULL,
 start_date DATE NOT NULL, end_date DATE NOT NULL, reason VARCHAR(1000) NULL, status ENUM('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
 submitted_by BIGINT UNSIGNED NULL, submitted_at DATETIME NULL, decided_by BIGINT UNSIGNED NULL, decided_at DATETIME NULL, decision_reason VARCHAR(1000) NULL,
 cancelled_by BIGINT UNSIGNED NULL, cancelled_at DATETIME NULL, cancellation_reason VARCHAR(1000) NULL, created_by BIGINT UNSIGNED NOT NULL, updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_leave_employee_period(employee_profile_id,start_date,end_date), KEY idx_leave_employee_status(employee_profile_id,status,start_date), KEY idx_leave_scope(concession_id,agency_id_snapshot,status,start_date), KEY idx_leave_type(leave_type_id,status),
 CONSTRAINT chk_leave_dates CHECK(end_date>=start_date), CONSTRAINT chk_leave_state CHECK((status='DRAFT' AND submitted_at IS NULL AND decided_at IS NULL AND cancelled_at IS NULL) OR (status='PENDING' AND submitted_at IS NOT NULL AND decided_at IS NULL AND cancelled_at IS NULL) OR (status IN('APPROVED','REJECTED') AND submitted_at IS NOT NULL AND decided_at IS NOT NULL AND cancelled_at IS NULL) OR (status='CANCELLED' AND cancelled_at IS NOT NULL)),
 CONSTRAINT fk_leave_employee FOREIGN KEY(employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT, CONSTRAINT fk_leave_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_leave_agency FOREIGN KEY(agency_id_snapshot) REFERENCES agencies(id) ON DELETE SET NULL, CONSTRAINT fk_leave_type FOREIGN KEY(leave_type_id) REFERENCES employee_leave_types(id) ON DELETE RESTRICT,
 CONSTRAINT fk_leave_submitter FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE SET NULL, CONSTRAINT fk_leave_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_leave_canceller FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL, CONSTRAINT fk_leave_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT, CONSTRAINT fk_leave_updater FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
    CONSTRAINT chk_contract_transition_data CHECK ((status='DRAFT' AND activated_at IS NULL AND ended_at IS NULL AND cancelled_at IS NULL) OR (status='ACTIVE' AND activated_at IS NOT NULL AND ended_at IS NULL AND cancelled_at IS NULL) OR (status='ENDED' AND activated_at IS NOT NULL AND ended_at IS NOT NULL AND effective_end_date IS NOT NULL AND cancelled_at IS NULL) OR (status='CANCELLED' AND cancelled_at IS NOT NULL AND ended_at IS NULL)),
    CONSTRAINT fk_contract_employee FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_contract_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_contract_type FOREIGN KEY (contract_type_id) REFERENCES employee_contract_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_contract_previous FOREIGN KEY (previous_contract_id) REFERENCES employee_contracts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_contract_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_contract_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE internal_stock_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concession_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_internal_stock_category_concession_code (concession_id,code),
    UNIQUE KEY uk_internal_stock_category_concession_name (concession_id,name),
    INDEX idx_internal_stock_category_active (concession_id,is_active,name),
    CONSTRAINT fk_internal_stock_category_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE internal_stock_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agency_id BIGINT UNSIGNED NOT NULL,
    designation VARCHAR(190) NOT NULL,
    reference VARCHAR(100) NULL,
    category VARCHAR(100) NULL,
    category_id BIGINT UNSIGNED NULL,
    unit VARCHAR(40) NOT NULL,
    current_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    minimum_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_internal_stock_agency_reference (agency_id,reference),
    INDEX idx_internal_stock_threshold (agency_id,is_active,current_quantity,minimum_quantity),
    INDEX idx_internal_stock_category (category_id),
    CONSTRAINT chk_internal_stock_quantities CHECK (current_quantity >= 0 AND minimum_quantity >= 0),
    CONSTRAINT fk_internal_stock_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_internal_stock_item_category FOREIGN KEY (category_id) REFERENCES internal_stock_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_internal_stock_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_internal_stock_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE internal_stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM('entry','exit') NOT NULL,
    quantity DECIMAL(14,3) NOT NULL,
    quantity_before DECIMAL(14,3) NOT NULL,
    quantity_after DECIMAL(14,3) NOT NULL,
    movement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(500) NULL,
    reference VARCHAR(100) NULL,
    performed_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_internal_movement_item_date (item_id,movement_date),
    INDEX idx_internal_movement_agency_date (agency_id,movement_date),
    CONSTRAINT chk_internal_movement_quantity CHECK (quantity > 0 AND quantity_before >= 0 AND quantity_after >= 0),
    CONSTRAINT fk_internal_movement_item FOREIGN KEY (item_id) REFERENCES internal_stock_items(id) ON DELETE RESTRICT,
    CONSTRAINT fk_internal_movement_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_internal_movement_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE budget_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concession_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_budget_category_concession_code (concession_id,code),
    UNIQUE KEY uk_budget_category_concession_name (concession_id,name),
    INDEX idx_budget_category_active (concession_id,is_active,name),
    CONSTRAINT fk_budget_category_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_budget_category_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_budget_category_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE budgets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scope_type ENUM('agency','concession') NOT NULL,
    agency_id BIGINT UNSIGNED NULL,
    concession_id BIGINT UNSIGNED NULL,
    label VARCHAR(190) NOT NULL,
    initial_amount DECIMAL(18,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    category VARCHAR(100) NULL,
    category_id BIGINT UNSIGNED NULL,
    status ENUM('draft','active','closed','cancelled') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_budget_agency_period (agency_id,start_date,end_date,status),
    INDEX idx_budget_concession_period (concession_id,start_date,end_date,status),
    INDEX idx_budget_category (category_id),
    CONSTRAINT chk_budget_amount_dates CHECK (initial_amount > 0 AND start_date <= end_date),
    CONSTRAINT chk_budget_scope CHECK ((scope_type='agency' AND agency_id IS NOT NULL AND concession_id IS NULL) OR (scope_type='concession' AND concession_id IS NOT NULL AND agency_id IS NULL)),
    CONSTRAINT fk_budget_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_budget_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_budget_category FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_budget_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_budget_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE budget_expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    budget_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(190) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    expense_date DATE NOT NULL,
    category VARCHAR(100) NULL,
    category_id BIGINT UNSIGNED NULL,
    reference VARCHAR(100) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expense_budget_date (budget_id,expense_date),
    INDEX idx_expense_category_date (category,expense_date),
    INDEX idx_budget_expense_category (category_id,expense_date),
    CONSTRAINT chk_expense_positive CHECK (amount > 0),
    CONSTRAINT fk_expense_budget FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE RESTRICT,
    CONSTRAINT fk_budget_expense_category FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_expense_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE budget_fund_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    budget_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM('additional_allocation') NOT NULL DEFAULT 'additional_allocation',
    amount DECIMAL(18,2) NOT NULL,
    reason VARCHAR(500) NULL,
    reference VARCHAR(100) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_budget_fund_movement_budget_date (budget_id,created_at,id),
    CONSTRAINT chk_budget_fund_movement_positive CHECK (amount > 0),
    CONSTRAINT fk_budget_fund_movement_budget FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_budget_fund_movement_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. CRM
-- ============================================================

CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    customer_type ENUM('individual','company') NOT NULL DEFAULT 'individual',
    civility ENUM('M.','Mme','Société') NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    company_name VARCHAR(200) NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(50) NULL,
    secondary_phone VARCHAR(50) NULL,
    address TEXT NULL,
    postal_code VARCHAR(30) NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    tax_identifier VARCHAR(100) NULL,
    source VARCHAR(100) NULL,
    segment VARCHAR(100) NULL,
    score DECIMAL(8,2) NULL,
    classification ENUM('occasional','regular','vip','at_risk') NOT NULL DEFAULT 'occasional',
    notes TEXT NULL,
    assigned_user_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    normalized_email VARCHAR(190)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci
        GENERATED ALWAYS AS (NULLIF(LOWER(TRIM(email)),'')) STORED,
    normalized_phone VARCHAR(50)
        CHARACTER SET ascii COLLATE ascii_bin
        GENERATED ALWAYS AS (NULLIF(REGEXP_REPLACE(phone,'[^0-9]',''),'')) STORED,
    INDEX idx_customer_email (email),
    INDEX idx_customer_phone (phone),
    INDEX idx_customer_agency (agency_id),
    INDEX idx_customer_assigned (assigned_user_id),
    INDEX idx_customer_classification (classification),
    UNIQUE KEY uq_customer_agency_normalized_email (agency_id,normalized_email),
    UNIQUE KEY uq_customer_agency_normalized_phone (agency_id,normalized_phone),
    CONSTRAINT fk_customer_agency
        FOREIGN KEY (agency_id) REFERENCES agencies(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_user
        FOREIGN KEY (assigned_user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE customer_contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_title VARCHAR(120) NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(50) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_contact_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE leads (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NULL,
    assigned_user_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    source VARCHAR(100) NULL,
    status ENUM('new','contacted','qualified','converted','lost') NOT NULL DEFAULT 'new',
    priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    company_name VARCHAR(200) NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(50) NULL,
    notes TEXT NULL,
    converted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lead_status (status),
    INDEX idx_lead_priority (priority),
    INDEX idx_lead_created_by (created_by),
    INDEX idx_lead_source (source),
    CONSTRAINT fk_lead_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_lead_user
        FOREIGN KEY (assigned_user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_lead_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE campaigns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type ENUM('sms','email','mixed') NOT NULL,
    status ENUM('draft','scheduled','running','completed','cancelled') NOT NULL DEFAULT 'draft',
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    subject VARCHAR(255) NULL,
    message_template TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_campaign_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE opportunities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lead_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    assigned_user_id BIGINT UNSIGNED NULL,
    title VARCHAR(200) NOT NULL,
    stage ENUM(
        'new','contacted','qualified','appointment',
        'test_drive','offer','negotiation','won','lost'
    ) NOT NULL DEFAULT 'new',
    expected_value DECIMAL(18,2) NULL,
    probability DECIMAL(5,2) NULL,
    expected_close_date DATE NULL,
    lost_reason VARCHAR(255) NULL,
    won_at DATETIME NULL,
    lost_at DATETIME NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_opportunity_stage (stage),
    CONSTRAINT fk_opportunity_lead
        FOREIGN KEY (lead_id) REFERENCES leads(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_opportunity_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_opportunity_user
        FOREIGN KEY (assigned_user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NULL,
    lead_id BIGINT UNSIGNED NULL,
    opportunity_id BIGINT UNSIGNED NULL,
    assigned_user_id BIGINT UNSIGNED NULL,
    campaign_id BIGINT UNSIGNED NULL,
    type ENUM('call','email','task','appointment','test_drive','note','other') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status ENUM('planned','completed','cancelled') NOT NULL DEFAULT 'planned',
    due_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_due (due_at),
    CONSTRAINT fk_activity_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_activity_lead
        FOREIGN KEY (lead_id) REFERENCES leads(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_activity_opportunity
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_activity_user
        FOREIGN KEY (assigned_user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_activity_campaign
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE follow_ups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NULL,
    lead_id BIGINT UNSIGNED NULL,
    opportunity_id BIGINT UNSIGNED NULL,
    assigned_user_id BIGINT UNSIGNED NULL,
    activity_id BIGINT UNSIGNED NULL,
    scheduled_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    status ENUM('pending','completed','cancelled','overdue') NOT NULL DEFAULT 'pending',
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_follow_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_follow_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    CONSTRAINT fk_follow_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
    CONSTRAINT fk_follow_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_follow_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 4. RÉFÉRENTIEL VÉHICULES / STOCK AUTOMOBILE
-- ============================================================

CREATE TABLE brands (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    warranty_provider_id BIGINT UNSIGNED NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE models (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(50) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uk_model_brand_name (brand_id, name),
    CONSTRAINT fk_model_brand
        FOREIGN KEY (brand_id) REFERENCES brands(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NULL,
    engine VARCHAR(120) NULL,
    fuel_type VARCHAR(50) NULL,
    transmission VARCHAR(50) NULL,
    power VARCHAR(50) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_version_model
        FOREIGN KEY (model_id) REFERENCES models(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agency_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    type ENUM('showroom','yard','warehouse','workshop','delivery','other') NOT NULL,
    address TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_location_agency
        FOREIGN KEY (agency_id) REFERENCES agencies(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE vehicle_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agency_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    type ENUM('PARC','SHOWROOM') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    legacy_location_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_vehicle_location_agency_name_type (agency_id,name,type),
    UNIQUE KEY uq_vehicle_location_legacy (legacy_location_id),
    INDEX idx_vehicle_location_agency_type_active (agency_id,type,is_active),
    CONSTRAINT fk_vehicle_location_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_location_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_vehicle_location_legacy FOREIGN KEY (legacy_location_id) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    version_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    vehicle_location_id BIGINT UNSIGNED NULL,
    supplier_id BIGINT UNSIGNED NULL,
    vehicle_type ENUM('new','used','demo','courtesy') NOT NULL DEFAULT 'new',
    vin VARCHAR(50) NOT NULL UNIQUE,
    stock_number VARCHAR(80) NULL UNIQUE,
    registration_number VARCHAR(50) NULL,
    body_type VARCHAR(60) NULL,
    year SMALLINT UNSIGNED NULL,
    first_registration_date DATE NULL,
    color VARCHAR(80) NULL,
    interior_color VARCHAR(80) NULL,
    fuel_type VARCHAR(50) NULL,
    engine VARCHAR(120) NULL,
    transmission VARCHAR(50) NULL,
    fiscal_power SMALLINT UNSIGNED NULL,
    real_power SMALLINT UNSIGNED NULL,
    co2_emissions SMALLINT UNSIGNED NULL,
    mileage INT UNSIGNED NOT NULL DEFAULT 0,
    purchase_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    refurbishment_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
    transport_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
    administrative_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
    additional_costs DECIMAL(18,2) NOT NULL DEFAULT 0,
    catalog_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    minimum_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    status ENUM(
        'ordered','in_transit','received','preparation',
        'available','reserved','sold','delivered'
    ) NOT NULL DEFAULT 'ordered',
    entry_date DATE NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    archived_at DATETIME NULL,
    INDEX idx_vehicle_status (status),
    INDEX idx_vehicle_agency_status (agency_id, status),
    INDEX idx_vehicle_vehicle_location (vehicle_location_id),
    CONSTRAINT fk_vehicle_version
        FOREIGN KEY (version_id) REFERENCES versions(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_agency
        FOREIGN KEY (agency_id) REFERENCES agencies(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_location
        FOREIGN KEY (location_id) REFERENCES locations(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_dedicated_location
        FOREIGN KEY (vehicle_location_id) REFERENCES vehicle_locations(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    from_location_id BIGINT UNSIGNED NULL,
    from_vehicle_location_id BIGINT UNSIGNED NULL,
    to_location_id BIGINT UNSIGNED NULL,
    to_vehicle_location_id BIGINT UNSIGNED NULL,
    from_agency_id BIGINT UNSIGNED NULL,
    to_agency_id BIGINT UNSIGNED NULL,
    movement_type ENUM('entry','transfer','sale','delivery','return','adjustment') NOT NULL,
    reference_type VARCHAR(80) NULL,
    reference_id BIGINT UNSIGNED NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    reason VARCHAR(255) NULL,
    performed_by BIGINT UNSIGNED NULL,
    moved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vehicle_movement_vehicle (vehicle_id),
    INDEX idx_vm_from_vehicle_location (from_vehicle_location_id),
    INDEX idx_vm_to_vehicle_location (to_vehicle_location_id),
    CONSTRAINT fk_vm_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vm_from_location FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    CONSTRAINT fk_vm_to_location FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    CONSTRAINT fk_vm_from_vehicle_location FOREIGN KEY (from_vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE SET NULL,
    CONSTRAINT fk_vm_to_vehicle_location FOREIGN KEY (to_vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE SET NULL,
    CONSTRAINT fk_vm_from_agency FOREIGN KEY (from_agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
    CONSTRAINT fk_vm_to_agency FOREIGN KEY (to_agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
    CONSTRAINT fk_vm_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by BIGINT UNSIGNED NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255) NULL,
    CONSTRAINT fk_vsh_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vsh_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500) NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vehicle_image_order (vehicle_id, sort_order),
    CONSTRAINT fk_vehicle_image_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_vehicle_image_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_features (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL UNIQUE,is_active BOOLEAN NOT NULL DEFAULT TRUE) ENGINE=InnoDB;
CREATE TABLE vehicle_feature_assignments (vehicle_id BIGINT UNSIGNED NOT NULL,feature_id BIGINT UNSIGNED NOT NULL,PRIMARY KEY(vehicle_id,feature_id),CONSTRAINT fk_vfa_vehicle FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,CONSTRAINT fk_vfa_feature FOREIGN KEY(feature_id) REFERENCES vehicle_features(id) ON DELETE RESTRICT) ENGINE=InnoDB;
CREATE TABLE vehicle_price_history (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,vehicle_id BIGINT UNSIGNED NOT NULL,old_sale_price DECIMAL(18,2) NULL,new_sale_price DECIMAL(18,2) NOT NULL,old_minimum_price DECIMAL(18,2) NULL,new_minimum_price DECIMAL(18,2) NOT NULL,changed_by BIGINT UNSIGNED NULL,reason VARCHAR(255) NULL,changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX idx_vehicle_price_history(vehicle_id,changed_at),CONSTRAINT fk_vph_vehicle FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,CONSTRAINT fk_vph_user FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;

-- ============================================================
-- 5. VENTES / DEVIS / RÉSERVATIONS / REPRISE / FINANCEMENT
-- ============================================================

CREATE TABLE quotations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quotation_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    opportunity_id BIGINT UNSIGNED NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    status ENUM('draft','sent','negotiation','accepted','rejected','expired','cancelled') NOT NULL DEFAULT 'draft',
    valid_until DATE NULL,
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    total DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_mode ENUM('TAXABLE','TAX_EXEMPT') NOT NULL DEFAULT 'TAXABLE',
    price_input_mode ENUM('HT','TTC') NOT NULL DEFAULT 'HT',
    tax_rate_snapshot DECIMAL(8,4) NOT NULL DEFAULT 0,
    currency_code CHAR(3) NULL,
    document_identity_snapshot JSON NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quote_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_quote_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
    CONSTRAINT fk_quote_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_quote_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE quotation_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quotation_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_quote_item_quote FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    CONSTRAINT fk_quote_item_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE trade_ins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    opportunity_id BIGINT UNSIGNED NULL,
    brand VARCHAR(120) NULL,
    model VARCHAR(120) NULL,
    version VARCHAR(150) NULL,
    vin VARCHAR(50) NULL,
    registration_number VARCHAR(50) NULL,
    year SMALLINT UNSIGNED NULL,
    mileage INT UNSIGNED NULL,
    condition_description TEXT NULL,
    market_value DECIMAL(18,2) NOT NULL DEFAULT 0,
    trade_in_value DECIMAL(18,2) NOT NULL DEFAULT 0,
    refurbishment_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
    potential_margin DECIMAL(18,2) NOT NULL DEFAULT 0,
    status ENUM('estimated','accepted','rejected','acquired','resold') NOT NULL DEFAULT 'estimated',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trade_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_trade_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE financing (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    financier_name VARCHAR(200) NULL,
    financing_type VARCHAR(100) NULL,
    requested_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    financed_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    down_payment DECIMAL(18,2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(8,4) NULL,
    duration_months INT UNSIGNED NULL,
    monthly_payment DECIMAL(18,2) NULL,
    status ENUM('draft','submitted','approved','rejected','active','completed','cancelled') NOT NULL DEFAULT 'draft',
    reference_number VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_financing_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    opportunity_id BIGINT UNSIGNED NULL,
    quotation_id BIGINT UNSIGNED NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    salesperson_id BIGINT UNSIGNED NULL,
    financing_id BIGINT UNSIGNED NULL,
    trade_in_id BIGINT UNSIGNED NULL,
    status ENUM(
        'draft','reserved','ordered','confirmed',
        'preparation','ready_for_delivery','delivered',
        'cancelled'
    ) NOT NULL DEFAULT 'draft',
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    total DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_mode ENUM('TAXABLE','TAX_EXEMPT') NOT NULL DEFAULT 'TAXABLE',
    price_input_mode ENUM('HT','TTC') NOT NULL DEFAULT 'HT',
    tax_rate_snapshot DECIMAL(8,4) NOT NULL DEFAULT 0,
    currency_code CHAR(3) NULL,
    deposit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(18,2) NOT NULL DEFAULT 0,
    sold_at DATETIME NULL,
    notes TEXT NULL,
    idempotency_key VARCHAR(120) NULL,
    created_by BIGINT UNSIGNED NULL,
    cancellation_reason VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sales_quotation_id (quotation_id),
    UNIQUE KEY uk_sales_idempotency (idempotency_key),
    INDEX idx_sales_created_by (created_by),
    CONSTRAINT fk_sale_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sale_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
    CONSTRAINT fk_sale_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    CONSTRAINT fk_sale_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sale_salesperson FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sale_financing FOREIGN KEY (financing_id) REFERENCES financing(id) ON DELETE SET NULL,
    CONSTRAINT fk_sale_trade_in FOREIGN KEY (trade_in_id) REFERENCES trade_ins(id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sale_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    catalog_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    purchase_price_snapshot DECIMAL(18,2) NULL,
    refurbishment_cost_snapshot DECIMAL(18,2) NULL,
    transport_cost_snapshot DECIMAL(18,2) NULL,
    administrative_cost_snapshot DECIMAL(18,2) NULL,
    additional_costs_snapshot DECIMAL(18,2) NULL,
    total_cost_snapshot DECIMAL(18,2) NULL,
    CONSTRAINT fk_sale_item_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_item_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE reservations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reservation_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    sale_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    status ENUM('pending','confirmed','expired','converted','cancelled') NOT NULL DEFAULT 'pending',
    reserved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    CONSTRAINT fk_res_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_res_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_res_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    CONSTRAINT fk_res_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 6. SHOWROOM / RÉCEPTION
-- ============================================================

CREATE TABLE showroom_visits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NULL,
    lead_id BIGINT UNSIGNED NULL,
    origin ENUM('showroom','crm') NOT NULL DEFAULT 'showroom',
    visitor_name VARCHAR(200) NULL,
    phone VARCHAR(50) NULL,
    reason VARCHAR(255) NULL,
    preferred_model VARCHAR(200) NULL,
    vehicle_id BIGINT UNSIGNED NULL,
    assigned_user_id BIGINT UNSIGNED NULL,
    greeted_by BIGINT UNSIGNED NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    queue_number INT UNSIGNED NULL,
    status ENUM('waiting','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'waiting',
    outcome ENUM('pending','lead_created','quotation','sale','no_interest','follow_up','crm_test_drive') NOT NULL DEFAULT 'pending',
    arrival_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_at DATETIME NULL,
    completed_at DATETIME NULL,
    cancellation_reason VARCHAR(255) NULL,
    notes TEXT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_showroom_agency_status_arrival (agency_id,status,arrival_at),
    INDEX idx_showroom_phone (phone),
    INDEX idx_showroom_lead (lead_id),
    INDEX idx_showroom_origin_status (origin,status),
    CONSTRAINT fk_visit_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_showroom_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    CONSTRAINT fk_visit_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT fk_visit_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_showroom_greeter FOREIGN KEY (greeted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_visit_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE showroom_test_drives (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    lead_id BIGINT UNSIGNED NULL,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    advisor_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    driver_name VARCHAR(200) NOT NULL,
    driver_phone VARCHAR(50) NULL,
    license_number VARCHAR(100) NULL,
    mileage_out INT UNSIGNED NOT NULL,
    mileage_in INT UNSIGNED NULL,
    status ENUM('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
    started_at DATETIME NULL,
    returned_at DATETIME NULL,
    customer_feedback TEXT NULL,
    internal_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_test_drive_visit (visit_id),
    INDEX idx_test_drive_vehicle_status (vehicle_id,status),
    INDEX idx_test_drive_agency_date (agency_id,created_at),
    CONSTRAINT fk_td_visit FOREIGN KEY (visit_id) REFERENCES showroom_visits(id) ON DELETE CASCADE,
    CONSTRAINT fk_td_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_td_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    CONSTRAINT fk_td_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_td_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_td_advisor FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_td_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 7. SAV / ATELIER
-- ============================================================

CREATE TABLE service_appointments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    advisor_id BIGINT UNSIGNED NULL,
    scheduled_at DATETIME NOT NULL,
    reason VARCHAR(255) NULL,
    symptoms TEXT NULL,
    status ENUM('scheduled','confirmed','received','cancelled','completed') NOT NULL DEFAULT 'scheduled',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sa_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sa_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sa_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sa_advisor FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    appointment_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    advisor_id BIGINT UNSIGNED NULL,
    mileage_in INT UNSIGNED NULL,
    complaint TEXT NULL,
    diagnosis_summary TEXT NULL,
    warranty_covered BOOLEAN NOT NULL DEFAULT FALSE,
    warranty_reference VARCHAR(100) NULL,
    courtesy_vehicle_id BIGINT UNSIGNED NULL,
    status ENUM(
        'planned','received','diagnosis','waiting_approval',
        'in_progress','quality_control','ready','invoiced',
        'delivered','closed','cancelled','abandonment_pending','abandoned'
    ) NOT NULL DEFAULT 'planned',
    estimated_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    actual_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    cancellation_reason VARCHAR(500) NULL,
    created_by BIGINT UNSIGNED NULL,
    received_at DATETIME NULL,
    promised_completion_at DATETIME NULL,
    closed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    abandonment_reason_code VARCHAR(50) NULL,
    abandonment_reason VARCHAR(500) NULL,
    abandonment_requested_at DATETIME NULL,
    abandonment_requested_by BIGINT UNSIGNED NULL,
    abandoned_at DATETIME NULL,
    abandoned_by BIGINT UNSIGNED NULL,
    CONSTRAINT fk_ro_appointment FOREIGN KEY (appointment_id) REFERENCES service_appointments(id) ON DELETE SET NULL,
    CONSTRAINT fk_ro_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ro_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ro_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ro_advisor FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE SET NULL
    ,CONSTRAINT fk_ro_courtesy_vehicle FOREIGN KEY (courtesy_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    ,CONSTRAINT fk_ro_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ,CONSTRAINT fk_ro_abandonment_requested_by FOREIGN KEY (abandonment_requested_by) REFERENCES users(id) ON DELETE SET NULL
    ,CONSTRAINT fk_ro_abandoned_by FOREIGN KEY (abandoned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(40) NULL,
    new_status VARCHAR(40) NOT NULL,
    reason VARCHAR(500) NULL,
    changed_by BIGINT UNSIGNED NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ro_history (repair_order_id, changed_at),
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_reception_inspections (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL UNIQUE,
    fuel_level VARCHAR(50) NULL,
    cleanliness VARCHAR(100) NULL,
    bodywork_damage TEXT NULL,
    items_in_vehicle TEXT NULL,
    mileage INT UNSIGNED NULL,
    observations TEXT NULL,
    customer_signature LONGTEXT NULL,
    inspected_by BIGINT UNSIGNED NULL,
    inspected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_approvals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    approved BOOLEAN NOT NULL,
    approved_amount DECIMAL(18,2) NULL,
    customer_name VARCHAR(200) NOT NULL,
    signature_data LONGTEXT NULL,
    notes TEXT NULL,
    recorded_by BIGINT UNSIGNED NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE diagnostics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    technician_id BIGINT UNSIGNED NULL,
    diagnosis TEXT NOT NULL,
    recommendations TEXT NULL,
    estimated_hours DECIMAL(10,2) NULL,
    diagnosed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_diag_ro FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE interventions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    technician_id BIGINT UNSIGNED NULL,
    description TEXT NOT NULL,
    intervention_type VARCHAR(100) NULL,
    planned_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    status ENUM('planned','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
    request_key VARCHAR(64) NULL,
    estimate_item_id BIGINT UNSIGNED NULL,
    INDEX fk_intervention_ro (repair_order_id),
    UNIQUE KEY uk_intervention_request (repair_order_id,request_key),
    UNIQUE KEY uk_intervention_estimate_item (estimate_item_id),
    CONSTRAINT fk_intervention_ro FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;



CREATE TABLE technicians (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    agency_id BIGINT UNSIGNED NOT NULL,
    employee_code VARCHAR(50) NULL UNIQUE,
    specialty VARCHAR(150) NULL,
    hourly_rate DECIMAL(18,2) NOT NULL DEFAULT 0,
    available_hours_per_day DECIMAL(8,2) NOT NULL DEFAULT 8,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_technician_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_technician_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE workshop_bays (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agency_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    bay_type VARCHAR(100) NULL,
    capacity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    status ENUM('available','occupied','maintenance','inactive') NOT NULL DEFAULT 'available',
    UNIQUE KEY uk_workshop_bay_agency_name (agency_id,name),
    INDEX idx_workshop_bay_agency_status (agency_id,status),
    CONSTRAINT fk_bay_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE schedules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agency_id BIGINT UNSIGNED NOT NULL,
    technician_id BIGINT UNSIGNED NULL,
    bay_id BIGINT UNSIGNED NULL,
    repair_order_id BIGINT UNSIGNED NULL,
    intervention_id BIGINT UNSIGNED NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    status ENUM('planned','confirmed','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_schedule_agency_range (agency_id,starts_at,ends_at),
    INDEX idx_schedule_technician_range (technician_id,starts_at,ends_at),
    INDEX idx_schedule_bay_range (bay_id,starts_at,ends_at),
    CONSTRAINT fk_schedule_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_schedule_technician FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_bay FOREIGN KEY (bay_id) REFERENCES workshop_bays(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_ro FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_intervention FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
    CONSTRAINT fk_schedule_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_schedule_range CHECK (ends_at > starts_at)
) ENGINE=InnoDB;

CREATE TABLE work_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    technician_id BIGINT UNSIGNED NOT NULL,
    intervention_id BIGINT UNSIGNED NULL,
    bay_id BIGINT UNSIGNED NULL,
    started_at DATETIME NOT NULL,
    paused_at DATETIME NULL,
    accumulated_pause_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    ended_at DATETIME NULL,
    status ENUM('running','paused','completed','cancelled') NOT NULL DEFAULT 'running',
    created_by BIGINT UNSIGNED NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_work_session_technician_status (technician_id,status),
    INDEX idx_work_session_bay_status (bay_id,status),
    CONSTRAINT fk_ws_ro FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ws_technician FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ws_intervention FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
    CONSTRAINT fk_ws_bay FOREIGN KEY (bay_id) REFERENCES workshop_bays(id) ON DELETE SET NULL,
    CONSTRAINT fk_ws_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE workshop_session_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT UNSIGNED NOT NULL,
    action ENUM('started','paused','resumed','stopped','adjusted') NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    reason VARCHAR(500) NULL,
    changed_by BIGINT UNSIGNED NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_workshop_session_history (session_id,changed_at),
    CONSTRAINT fk_workshop_session_history_session FOREIGN KEY (session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_workshop_session_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE time_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    technician_id BIGINT UNSIGNED NOT NULL,
    repair_order_id BIGINT UNSIGNED NULL,
    intervention_id BIGINT UNSIGNED NULL,
    work_session_id BIGINT UNSIGNED NULL,
    entry_date DATE NOT NULL,
    hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    productive BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_time_entry_session (work_session_id),
    INDEX idx_time_entry_technician_date (technician_id,entry_date),
    CONSTRAINT fk_time_technician FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE RESTRICT,
    CONSTRAINT fk_time_ro FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_time_intervention FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
    CONSTRAINT fk_time_session FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE workshop_schedule_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    schedule_id BIGINT UNSIGNED NOT NULL,
    action ENUM('created','updated','cancelled') NOT NULL,
    old_values JSON NULL,new_values JSON NULL,changed_by BIGINT UNSIGNED NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_schedule_history(schedule_id,changed_at),
    FOREIGN KEY(schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE technician_unavailabilities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    technician_id BIGINT UNSIGNED NOT NULL,starts_at DATETIME NOT NULL,ends_at DATETIME NOT NULL,
    reason VARCHAR(255) NULL,created_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_technician_unavailability_range(technician_id,starts_at,ends_at),
    CONSTRAINT chk_unavailability_range CHECK(ends_at>starts_at),
    FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 8. PIÈCES / FOURNISSEURS / ACHATS / STOCK
-- repair_order_items est créé après parts, car il référence parts(id).
-- ============================================================

CREATE TABLE suppliers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    contact_name VARCHAR(150) NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(50) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    tax_identifier VARCHAR(100) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_parts_supplier BOOLEAN NOT NULL DEFAULT TRUE,
    is_vehicle_supplier BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_suppliers_business_active (is_parts_supplier,is_vehicle_supplier,is_active)
) ENGINE=InnoDB;

CREATE TABLE part_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_part_category_parent
        FOREIGN KEY (parent_id) REFERENCES part_categories(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE parts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NULL,
    supplier_id BIGINT UNSIGNED NULL,
    reference VARCHAR(100) NOT NULL UNIQUE,
    oem_reference VARCHAR(120) NULL,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(120) NULL,
    description TEXT NULL,
    purchase_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    -- LEGACY : conservés pour compatibilité historique. Ne pas utiliser comme source métier.
    -- La source d'autorité des seuils et quantités est exclusivement part_stocks.
    min_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    reserved_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    obsolete BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parts_oem_reference (oem_reference),
    CONSTRAINT fk_part_category FOREIGN KEY (category_id) REFERENCES part_categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_part_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE part_stocks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    location_key BIGINT UNSIGNED AS (IFNULL(location_id, 0)) STORED,
    current_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    reserved_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    min_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_part_stock_scope (part_id, agency_id, location_key),
    INDEX idx_part_stock_part (part_id), INDEX idx_part_stock_agency (agency_id),
    INDEX idx_part_stock_location (location_id), INDEX idx_part_stock_part_agency (part_id, agency_id),
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE workshop_labor_rates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concession_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NULL,
    parent_rate_id BIGINT UNSIGNED NULL,
    code VARCHAR(50) NOT NULL,
    label VARCHAR(150) NOT NULL,
    hourly_rate DECIMAL(18,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_configured BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    base_code_key VARCHAR(50) GENERATED ALWAYS AS (CASE WHEN agency_id IS NULL THEN code ELSE NULL END) STORED,
    CONSTRAINT chk_workshop_labor_rate_amount CHECK (hourly_rate >= 0),
    CONSTRAINT chk_workshop_labor_rate_scope CHECK (
        (agency_id IS NULL AND parent_rate_id IS NULL) OR
        (agency_id IS NOT NULL AND parent_rate_id IS NOT NULL)
    ),
    UNIQUE KEY uk_workshop_labor_rate_base_code (concession_id,base_code_key),
    UNIQUE KEY uk_workshop_labor_rate_agency_override (agency_id,parent_rate_id),
    INDEX idx_workshop_labor_rate_effective (concession_id,agency_id,is_active,is_configured,display_order),
    INDEX idx_workshop_labor_rate_parent (parent_rate_id),
    CONSTRAINT fk_workshop_labor_rate_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_workshop_labor_rate_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_workshop_labor_rate_parent FOREIGN KEY (parent_rate_id) REFERENCES workshop_labor_rates(id) ON DELETE RESTRICT,
    CONSTRAINT fk_workshop_labor_rate_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NULL,
    part_stock_id BIGINT UNSIGNED NULL,
    labor_rate_id BIGINT UNSIGNED NULL,
    rate_code_snapshot VARCHAR(50) NULL,
    rate_label_snapshot VARCHAR(150) NULL,
    intervention_id BIGINT UNSIGNED NULL,
    item_type ENUM('part','labor','accessory','other') NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    status ENUM('active','cancelled') NOT NULL DEFAULT 'active',
    cancelled_by BIGINT UNSIGNED NULL,
    cancelled_at DATETIME NULL,
    request_key VARCHAR(64) NULL,
    estimate_item_id BIGINT UNSIGNED NULL,
    INDEX fk_roi_ro (repair_order_id),
    UNIQUE KEY uk_repair_item_request (repair_order_id,request_key),
    UNIQUE KEY uk_repair_item_estimate (estimate_item_id),
    INDEX idx_repair_item_labor_rate (labor_rate_id),
    CONSTRAINT fk_roi_ro FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_roi_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE SET NULL,
    CONSTRAINT fk_roi_stock FOREIGN KEY (part_stock_id) REFERENCES part_stocks(id) ON DELETE RESTRICT,
    CONSTRAINT fk_roi_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_roi_intervention FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
    CONSTRAINT fk_repair_item_labor_rate FOREIGN KEY (labor_rate_id) REFERENCES workshop_labor_rates(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_quality_controls (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, repair_order_id BIGINT UNSIGNED NOT NULL,
    planned_work_completed BOOLEAN NOT NULL DEFAULT FALSE, defect_corrected BOOLEAN NOT NULL DEFAULT FALSE,
    road_test_performed BOOLEAN NOT NULL DEFAULT FALSE, no_leaks BOOLEAN NOT NULL DEFAULT FALSE,
    levels_checked BOOLEAN NOT NULL DEFAULT FALSE, cleanliness_checked BOOLEAN NOT NULL DEFAULT FALSE,
    result ENUM('passed','failed') NOT NULL, reason VARCHAR(500) NULL, observations TEXT NULL,
    controlled_by BIGINT UNSIGNED NULL, controlled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_repair_qc_order_date(repair_order_id,controlled_at),
    FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(controlled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_order_handovers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, repair_order_id BIGINT UNSIGNED NOT NULL UNIQUE,
    customer_name VARCHAR(200) NOT NULL, mileage_out INT UNSIGNED NULL, observations TEXT NULL,
    signature_data LONGTEXT NULL, handed_over_by BIGINT UNSIGNED NULL,
    handed_over_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    handover_type ENUM('repair','abandonment') NOT NULL DEFAULT 'repair',
    FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    FOREIGN KEY(handed_over_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE part_reservations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    part_stock_id BIGINT UNSIGNED NULL,
    quantity DECIMAL(12,2) NOT NULL,
    status ENUM('reserved','consumed','released') NOT NULL DEFAULT 'reserved',
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_key VARCHAR(64) NULL,
    estimate_item_id BIGINT UNSIGNED NULL,
    consumed_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    INDEX repair_order_id (repair_order_id),
    UNIQUE KEY uk_reservation_request (repair_order_id,request_key),
    UNIQUE KEY uk_reservation_estimate_item (estimate_item_id),
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
    FOREIGN KEY (agency_id) REFERENCES agencies(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (part_stock_id) REFERENCES part_stocks(id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE repair_order_estimate_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NULL,
    labor_rate_id BIGINT UNSIGNED NULL,
    rate_code_snapshot VARCHAR(50) NULL,
    rate_label_snapshot VARCHAR(150) NULL,
    item_type ENUM('part','labor') NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL,
    request_key VARCHAR(64) NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_repair_estimate_request (repair_order_id,request_key),
    INDEX idx_repair_estimate_order (repair_order_id),
    INDEX idx_repair_estimate_labor_rate (labor_rate_id),
    CONSTRAINT fk_repair_estimate_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_repair_estimate_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_repair_estimate_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_repair_estimate_labor_rate FOREIGN KEY (labor_rate_id) REFERENCES workshop_labor_rates(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE interventions
    ADD CONSTRAINT fk_intervention_estimate_item FOREIGN KEY (estimate_item_id) REFERENCES repair_order_estimate_items(id) ON DELETE RESTRICT;

ALTER TABLE part_reservations
    ADD CONSTRAINT fk_reservation_estimate_item FOREIGN KEY (estimate_item_id) REFERENCES repair_order_estimate_items(id) ON DELETE RESTRICT;

ALTER TABLE repair_order_items
    ADD CONSTRAINT fk_repair_item_estimate FOREIGN KEY (estimate_item_id) REFERENCES repair_order_estimate_items(id) ON DELETE RESTRICT;

CREATE TABLE purchase_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    status ENUM('draft','sent','confirmed','partially_received','received','cancelled') NOT NULL DEFAULT 'draft',
    ordered_at DATETIME NULL,
    expected_at DATETIME NULL,
    received_at DATETIME NULL,
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    total DECIMAL(18,2) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NOT NULL,
    quantity_ordered DECIMAL(12,2) NOT NULL,
    quantity_received DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_poi_order_part (purchase_order_id, part_id),
    CONSTRAINT fk_poi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE purchase_order_receipts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT UNSIGNED NOT NULL,
    receipt_number VARCHAR(80) NOT NULL,
    idempotency_key VARCHAR(120) NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    received_by BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_purchase_receipt_idempotency (purchase_order_id, idempotency_key),
    UNIQUE KEY uk_purchase_receipt_number (receipt_number),
    INDEX idx_purchase_receipt_date (purchase_order_id, received_at),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE purchase_order_receipt_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receipt_id BIGINT UNSIGNED NOT NULL,
    purchase_order_item_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    UNIQUE KEY uk_receipt_item (receipt_id, purchase_order_item_id),
    FOREIGN KEY (receipt_id) REFERENCES purchase_order_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
    CONSTRAINT chk_receipt_item_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE part_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    movement_type ENUM(
        'purchase','sale','repair_order','transfer_in','transfer_out',
        'return','inventory','adjustment','reservation','release'
    ) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    stock_before DECIMAL(12,2) NULL,
    stock_after DECIMAL(12,2) NULL,
    unit_cost DECIMAL(18,2) NULL,
    reference_type VARCHAR(80) NULL,
    reference_id BIGINT UNSIGNED NULL,
    correlation_key VARCHAR(120) NULL,
    reason VARCHAR(255) NULL,
    performed_by BIGINT UNSIGNED NULL,
    moved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_part_movement_part_date (part_id, moved_at),
    INDEX idx_part_movement_correlation (correlation_key),
    CONSTRAINT fk_pm_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pm_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pm_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    CONSTRAINT fk_pm_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 9. LIVRAISON
-- ============================================================

CREATE TABLE deliveries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    delivery_number VARCHAR(50) NOT NULL UNIQUE,
    sale_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    delivery_specialist_id BIGINT UNSIGNED NULL,
    scheduled_at DATETIME NULL,
    delivery_location VARCHAR(255) NULL,
    prepared_at DATETIME NULL,
    delivered_at DATETIME NULL,
    mileage_at_delivery INT UNSIGNED NULL,
    status ENUM('planned','preparing','quality_control','ready','delivered','cancelled') NOT NULL DEFAULT 'planned',
    customer_notes TEXT NULL,
    postponement_reason VARCHAR(500) NULL,
    cancellation_reason VARCHAR(500) NULL,
    quality_notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_delivery_agency_schedule (agency_id,scheduled_at),
    INDEX idx_delivery_status_schedule (status,scheduled_at),
    CONSTRAINT fk_delivery_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_specialist FOREIGN KEY (delivery_specialist_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_delivery_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_checklists (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT UNSIGNED NOT NULL,
    template_id BIGINT UNSIGNED NULL,
    item_name VARCHAR(200) NOT NULL,
    category ENUM('preparation','quality','documents','handover') NOT NULL DEFAULT 'quality',
    sort_order INT NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by BIGINT UNSIGNED NULL,
    completed_at DATETIME NULL,
    notes TEXT NULL,
    INDEX idx_delivery_checklist_phase (delivery_id,category,is_required,is_completed,sort_order),
    CONSTRAINT fk_dc_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    CONSTRAINT fk_dc_user FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT UNSIGNED NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    document_type VARCHAR(100) NULL,
    document_url VARCHAR(500) NULL,
    file_name VARCHAR(255) NULL,
    mime_type VARCHAR(100) NULL,
    file_size BIGINT UNSIGNED NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    received BOOLEAN NOT NULL DEFAULT FALSE,
    received_by BIGINT UNSIGNED NULL,
    received_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dd_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    CONSTRAINT fk_delivery_document_receiver FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_signatures (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT UNSIGNED NOT NULL,
    signer_name VARCHAR(200) NOT NULL,
    signed_by BIGINT UNSIGNED NULL,
    signature_data LONGTEXT NULL,
    consent_text VARCHAR(500) NULL,
    document_hash CHAR(64) NULL,
    signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    CONSTRAINT fk_ds_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    UNIQUE KEY uk_delivery_signature_final (delivery_id),
    CONSTRAINT fk_delivery_signature_user FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT UNSIGNED NOT NULL,
    old_status ENUM('planned','preparing','quality_control','ready','delivered','cancelled') NULL,
    new_status ENUM('planned','preparing','quality_control','ready','delivered','cancelled') NOT NULL,
    reason VARCHAR(500) NULL,
    changed_by BIGINT UNSIGNED NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_delivery_history (delivery_id,changed_at),
    CONSTRAINT fk_delivery_history_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    CONSTRAINT fk_delivery_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_checklist_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_code VARCHAR(80) NULL UNIQUE,
    agency_id BIGINT UNSIGNED NULL,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'quality',
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_delivery_template_agency (agency_id,is_active,sort_order),
    CONSTRAINT fk_delivery_template_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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

-- ============================================================
-- 10. FACTURATION / ENCAISSEMENTS
-- ============================================================

CREATE TABLE payment_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    requires_reference BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE document_sequences (
    document_type VARCHAR(30) NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    sequence_year SMALLINT UNSIGNED NOT NULL,
    last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (document_type,agency_id,sequence_year),
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    sale_id BIGINT UNSIGNED NULL,
    repair_order_id BIGINT UNSIGNED NULL,
    invoice_type ENUM('vehicle','workshop','parts','accessories','other','manual') NOT NULL,
    status ENUM('draft','issued','partially_paid','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL,
    due_date DATE NULL,
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    total DECIMAL(18,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(18,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency_code CHAR(3) NOT NULL DEFAULT 'XAF',
    tax_mode ENUM('TAXABLE','TAX_EXEMPT') NOT NULL DEFAULT 'TAXABLE',
    price_input_mode ENUM('HT','TTC') NOT NULL DEFAULT 'HT',
    tax_rate_snapshot DECIMAL(8,4) NOT NULL DEFAULT 0,
    document_identity_snapshot JSON NULL,
    accounting_exported BOOLEAN NOT NULL DEFAULT FALSE,
    accounting_exported_at DATETIME NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    idempotency_key VARCHAR(120) NULL,
    cancellation_reason VARCHAR(500) NULL,
    cancelled_by BIGINT UNSIGNED NULL,
    cancelled_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    UNIQUE KEY uk_invoice_idempotency (idempotency_key),
    INDEX idx_invoice_agency_dates (agency_id,issue_date,due_date,status),
    CONSTRAINT fk_invoice_ro FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_financial_authorizations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  concession_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) NOT NULL,
  balance_due_snapshot DECIMAL(15,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  guarantee_type VARCHAR(100) NULL,
  guarantee_details TEXT NULL,
  guarantee_reference VARCHAR(150) NULL,
  balance_due_date DATE NULL,
  payment_terms VARCHAR(1000) NULL,
  status ENUM('AUTHORIZED','REVOKED','SUPERSEDED','USED') NOT NULL DEFAULT 'AUTHORIZED',
  client_request_id CHAR(36) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  authorized_by BIGINT UNSIGNED NOT NULL,
  authorized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by BIGINT UNSIGNED NULL,
  revoked_at DATETIME NULL,
  revocation_reason VARCHAR(1000) NULL,
  used_by BIGINT UNSIGNED NULL,
  used_at DATETIME NULL,
  used_delivery_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_fin_auth_request (created_by,client_request_id),
  KEY idx_delivery_fin_auth_sale_status (sale_id,status,id),
  KEY idx_delivery_fin_auth_invoice (invoice_id,id),
  KEY idx_delivery_fin_auth_scope (concession_id,agency_id,id),
  CONSTRAINT chk_delivery_fin_auth_snapshot CHECK (total_amount >= 0 AND paid_amount >= 0 AND balance_due_snapshot > 0),
  CONSTRAINT fk_delivery_fin_auth_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_authorizer FOREIGN KEY (authorized_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_revoker FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_user FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_fin_auth_delivery FOREIGN KEY (used_delivery_id) REFERENCES deliveries(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE invoice_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NULL,
    part_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
    source_type VARCHAR(64) NULL,
    source_id BIGINT UNSIGNED NULL,
    UNIQUE KEY uq_invoice_item_source (source_type,source_id),
    INDEX idx_invoice_item_source (source_type,source_id),
    CONSTRAINT fk_invoice_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_item_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_item_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE delivery_service_catalog (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concession_id BIGINT UNSIGNED NOT NULL, code VARCHAR(80) NOT NULL, name VARCHAR(180) NOT NULL,
  description VARCHAR(1000) NULL, default_unit_price DECIMAL(18,2) NOT NULL, currency_code CHAR(3) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0, created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_service_catalog_code (concession_id,code), KEY idx_delivery_service_catalog_active (concession_id,is_active,display_order,id),
  CONSTRAINT chk_delivery_service_catalog_price CHECK (default_unit_price > 0),
  CONSTRAINT fk_delivery_service_catalog_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_catalog_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE delivery_services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, delivery_id BIGINT UNSIGNED NOT NULL, sale_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NOT NULL,
  concession_id BIGINT UNSIGNED NOT NULL, catalog_service_id BIGINT UNSIGNED NOT NULL, invoice_id BIGINT UNSIGNED NOT NULL, invoice_item_id BIGINT UNSIGNED NULL,
  code_snapshot VARCHAR(80) NOT NULL, name_snapshot VARCHAR(180) NOT NULL, description_snapshot VARCHAR(1000) NULL, quantity DECIMAL(12,2) NOT NULL,
  unit_price_snapshot DECIMAL(18,2) NOT NULL, amount DECIMAL(18,2) NOT NULL, currency_code CHAR(3) NOT NULL, client_request_id CHAR(36) NOT NULL,
  payload_hash CHAR(64) NOT NULL, created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_delivery_service_request (created_by,client_request_id), UNIQUE KEY uq_delivery_service_catalog_once (delivery_id,catalog_service_id),
  UNIQUE KEY uq_delivery_service_invoice (invoice_id), UNIQUE KEY uq_delivery_service_invoice_item (invoice_item_id), KEY idx_delivery_service_delivery (delivery_id,id), KEY idx_delivery_service_sale (sale_id,id),
  CONSTRAINT chk_delivery_service_quantity CHECK (quantity > 0), CONSTRAINT chk_delivery_service_price CHECK (unit_price_snapshot > 0 AND amount > 0),
  CONSTRAINT fk_delivery_service_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_catalog FOREIGN KEY (catalog_service_id) REFERENCES delivery_service_catalog(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_invoice_item FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_service_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NOT NULL,
    received_by BIGINT UNSIGNED NULL,
    amount DECIMAL(18,2) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference VARCHAR(150) NULL,
    status ENUM('pending','confirmed','rejected','refunded') NOT NULL DEFAULT 'confirmed',
    notes TEXT NULL,
    idempotency_key VARCHAR(120) NULL,
    refund_reason VARCHAR(500) NULL,
    refunded_by BIGINT UNSIGNED NULL,
    refunded_at DATETIME NULL,
    UNIQUE KEY uk_payment_idempotency (idempotency_key),
    INDEX idx_payment_invoice_date (invoice_id,payment_date,status),
    CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_user FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_payment_refunded_by FOREIGN KEY (refunded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE credit_notes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    credit_note_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    status ENUM('draft','issued','applied','cancelled') NOT NULL DEFAULT 'draft',
    reason TEXT NOT NULL,
    amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    issue_date DATE NOT NULL,
    idempotency_key VARCHAR(120) NULL,
    UNIQUE KEY uk_credit_note_idempotency (idempotency_key),
    INDEX idx_credit_invoice_date (invoice_id,issue_date,status),
    CONSTRAINT fk_credit_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_credit_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_credit_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE payment_refunds (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT UNSIGNED NOT NULL,
    invoice_id BIGINT UNSIGNED NOT NULL,
    credit_note_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    refunded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refunded_by BIGINT UNSIGNED NULL,
    idempotency_key VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_payment_refund_idempotency (idempotency_key),
    INDEX idx_payment_refund_payment (payment_id,refunded_at),
    INDEX idx_payment_refund_invoice (invoice_id,refunded_at),
    INDEX idx_payment_refund_credit_note (credit_note_id,refunded_at),
    CONSTRAINT fk_payment_refund_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_refund_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_refund_credit_note FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_refund_user FOREIGN KEY (refunded_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_payment_refund_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- ============================================================
-- 11. NOTIFICATIONS / DOCUMENTS / PARAMÈTRES / AUDIT
-- ============================================================

CREATE TABLE notification_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    event_code VARCHAR(100) NOT NULL UNIQUE,
    channel ENUM('notification','email','sms','mixed') NOT NULL,
    subject_template VARCHAR(255) NULL,
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    template_id BIGINT UNSIGNED NULL,
    channel ENUM('notification','email','sms') NOT NULL,
    recipient VARCHAR(190) NULL,
    subject VARCHAR(255) NULL,
    message TEXT NOT NULL,
    status ENUM('queued','sent','failed','read') NOT NULL DEFAULT 'queued',
    delivery_status ENUM('queued','sent','failed') NOT NULL DEFAULT 'sent',
    scheduled_at DATETIME NULL,
    sent_at DATETIME NULL,
    read_at DATETIME NULL,
    archived_at DATETIME NULL,
    archived_by BIGINT UNSIGNED NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT UNSIGNED NULL,
    error_message TEXT NULL,
    reference_type VARCHAR(80) NULL,
    reference_id BIGINT UNSIGNED NULL,
    event_type VARCHAR(100) NULL,
    priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
    event_key VARCHAR(190) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user_read_date (user_id,read_at,created_at),
    INDEX idx_notifications_event_type (event_type),
    UNIQUE INDEX uk_notifications_event_key (event_key),
    INDEX idx_notifications_user_visible (user_id,channel,deleted_at,archived_at,read_at,created_at),
    INDEX idx_notifications_archived_by (archived_by),
    INDEX idx_notifications_deleted_by (deleted_by),
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_notification_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_notification_template FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL
    ,CONSTRAINT fk_notification_archived_by FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL
    ,CONSTRAINT fk_notification_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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

CREATE TABLE documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uploaded_by BIGINT UNSIGNED NULL,
    origin ENUM('manual','generated') NOT NULL DEFAULT 'manual',
    source_key VARCHAR(190) NULL,
    title VARCHAR(190) NULL,
    category_id BIGINT UNSIGNED NULL,
    document_type VARCHAR(100) NULL,
    document_type_id BIGINT UNSIGNED NULL,
    reference VARCHAR(150) NULL,
    document_date DATE NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NULL,
    file_size BIGINT UNSIGNED NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    entity_type VARCHAR(80) NULL,
    entity_id BIGINT UNSIGNED NULL,
    agency_id BIGINT UNSIGNED NULL,
    concession_id BIGINT UNSIGNED NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    file_hash CHAR(64) NULL,
    expires_at DATE NULL,
    description TEXT NULL,
    archived_at DATETIME NULL,
    archived_by BIGINT UNSIGNED NULL,
    archive_reason VARCHAR(500) NULL,
    parent_document_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_document_entity (entity_type, entity_id),
    INDEX idx_documents_archive_date (is_archived,created_at),
    INDEX idx_documents_type (document_type),
    INDEX idx_documents_hash_entity (entity_type,entity_id,file_hash),
    INDEX idx_documents_parent (parent_document_id),
    INDEX idx_documents_category_type (category_id,document_type_id),
    INDEX idx_documents_attachment (entity_type,entity_id),
    INDEX idx_documents_agency (agency_id,created_at),
    UNIQUE INDEX uk_documents_source_key (source_key),
    CONSTRAINT fk_document_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_archived_by FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_parent FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_category FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_documents_type FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_documents_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_documents_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scope_type ENUM('global','group','concession','agency','department','user') NOT NULL DEFAULT 'global',
    scope_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
    setting_key VARCHAR(150) NOT NULL,
    setting_value JSON NULL,
    description TEXT NULL,
    updated_by BIGINT UNSIGNED NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_setting_scope_key (scope_type, scope_id, setting_key),
    CONSTRAINT fk_setting_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    module VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    action VARCHAR(80) NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_user_date (user_id, created_at),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- SAV-WARRANTY V1 : dossier, ventilation réelle et créance constructeur.
CREATE TABLE warranty_providers(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,code VARCHAR(50) NOT NULL UNIQUE,name VARCHAR(200) NOT NULL,tax_identifier VARCHAR(100) NULL,contact_name VARCHAR(150) NULL,email VARCHAR(190) NULL,phone VARCHAR(50) NULL,is_active BOOLEAN NOT NULL DEFAULT TRUE,warranty_available BOOLEAN NOT NULL DEFAULT TRUE,default_warranty_months SMALLINT UNSIGNED NULL,default_mileage_limit INT UNSIGNED NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,CHECK(default_warranty_months IS NULL OR default_warranty_months BETWEEN 1 AND 240),CHECK(default_mileage_limit IS NULL OR default_mileage_limit>0)) ENGINE=InnoDB;
ALTER TABLE brands ADD INDEX idx_brand_warranty_provider(warranty_provider_id),ADD CONSTRAINT fk_brand_warranty_provider FOREIGN KEY(warranty_provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE vehicle_warranty_contracts(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,sale_id BIGINT UNSIGNED NOT NULL,vehicle_id BIGINT UNSIGNED NOT NULL,customer_id BIGINT UNSIGNED NOT NULL,provider_id BIGINT UNSIGNED NULL,decision ENUM('UNDETERMINED','APPLICABLE','NOT_APPLICABLE') NOT NULL DEFAULT 'UNDETERMINED',status ENUM('PENDING_DECISION','NOT_APPLICABLE','PENDING_ACTIVATION','ACTIVE') NOT NULL DEFAULT 'PENDING_DECISION',provider_code_snapshot VARCHAR(50) NULL,provider_name_snapshot VARCHAR(200) NULL,duration_months SMALLINT UNSIGNED NULL,mileage_limit INT UNSIGNED NULL,decision_at DATETIME NULL,decided_by BIGINT UNSIGNED NULL,start_date DATETIME NULL,expiry_date DATETIME NULL,initial_mileage INT UNSIGNED NULL,activated_at DATETIME NULL,activated_by BIGINT UNSIGNED NULL,created_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_by BIGINT UNSIGNED NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uk_vwc_sale(sale_id),INDEX idx_vwc_vehicle(vehicle_id),INDEX idx_vwc_provider_status(provider_id,status),INDEX idx_vwc_customer(customer_id),CHECK(duration_months IS NULL OR duration_months BETWEEN 1 AND 240),CHECK(mileage_limit IS NULL OR mileage_limit>0),CHECK((decision='APPLICABLE' AND provider_id IS NOT NULL AND provider_code_snapshot IS NOT NULL AND provider_name_snapshot IS NOT NULL AND duration_months IS NOT NULL) OR (decision<>'APPLICABLE' AND provider_id IS NULL AND provider_code_snapshot IS NULL AND provider_name_snapshot IS NULL AND duration_months IS NULL AND mileage_limit IS NULL)),FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE RESTRICT,FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,FOREIGN KEY(provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT,FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE SET NULL,FOREIGN KEY(activated_by) REFERENCES users(id) ON DELETE SET NULL,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;
CREATE TABLE repair_order_warranties(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,repair_order_id BIGINT UNSIGNED NOT NULL UNIQUE,provider_id BIGINT UNSIGNED NULL,coverage_mode ENUM('FULL','PARTIAL') NULL,decision_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',allocation_status ENUM('UNALLOCATED','DRAFT','CONFIRMED','LEGACY_UNALLOCATED') NOT NULL DEFAULT 'UNALLOCATED',warranty_reference VARCHAR(100) NULL,authorization_reference VARCHAR(100) NULL,decision_comment TEXT NULL,decision_at DATETIME NULL,decided_by BIGINT UNSIGNED NULL,version INT UNSIGNED NOT NULL DEFAULT 1,legacy_source BOOLEAN NOT NULL DEFAULT FALSE,created_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_by BIGINT UNSIGNED NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,INDEX idx_row_provider_status(provider_id,decision_status),INDEX idx_row_decision_allocation(decision_status,allocation_status),FOREIGN KEY(repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,FOREIGN KEY(provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT,FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE SET NULL,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;
CREATE TABLE repair_order_warranty_allocations(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,warranty_id BIGINT UNSIGNED NOT NULL,repair_order_item_id BIGINT UNSIGNED NOT NULL UNIQUE,manufacturer_share_ht DECIMAL(18,2) NOT NULL,created_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_by BIGINT UNSIGNED NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,CHECK(manufacturer_share_ht>=0),INDEX idx_rowa_warranty(warranty_id),FOREIGN KEY(warranty_id) REFERENCES repair_order_warranties(id) ON DELETE CASCADE,FOREIGN KEY(repair_order_item_id) REFERENCES repair_order_items(id) ON DELETE RESTRICT,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;
CREATE TABLE warranty_claims(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,claim_number VARCHAR(50) NOT NULL UNIQUE,warranty_id BIGINT UNSIGNED NOT NULL UNIQUE,provider_id BIGINT UNSIGNED NOT NULL,agency_id BIGINT UNSIGNED NOT NULL,status ENUM('issued','partially_paid','paid','cancelled') NOT NULL DEFAULT 'issued',subtotal DECIMAL(18,2) NOT NULL,tax_total DECIMAL(18,2) NOT NULL,total DECIMAL(18,2) NOT NULL,amount_received DECIMAL(18,2) NOT NULL DEFAULT 0,balance_due DECIMAL(18,2) NOT NULL,currency_code CHAR(3) NOT NULL DEFAULT 'XAF',reference VARCHAR(100) NULL,issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,created_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,cancelled_by BIGINT UNSIGNED NULL,cancelled_at DATETIME NULL,cancellation_reason VARCHAR(500) NULL,INDEX idx_wc_agency_status(agency_id,status,issued_at),INDEX idx_wc_provider_status(provider_id,status),FOREIGN KEY(warranty_id) REFERENCES repair_order_warranties(id) ON DELETE RESTRICT,FOREIGN KEY(provider_id) REFERENCES warranty_providers(id) ON DELETE RESTRICT,FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;
CREATE TABLE warranty_claim_items(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,claim_id BIGINT UNSIGNED NOT NULL,repair_order_item_id BIGINT UNSIGNED NOT NULL,description VARCHAR(255) NOT NULL,item_type VARCHAR(20) NOT NULL,quantity_snapshot DECIMAL(12,2) NOT NULL,real_line_total_ht DECIMAL(18,2) NOT NULL,tax_rate_snapshot DECIMAL(8,4) NOT NULL,manufacturer_share_ht DECIMAL(18,2) NOT NULL,manufacturer_tax DECIMAL(18,2) NOT NULL,manufacturer_total DECIMAL(18,2) NOT NULL,UNIQUE KEY uk_wci_claim_item(claim_id,repair_order_item_id),FOREIGN KEY(claim_id) REFERENCES warranty_claims(id) ON DELETE CASCADE,FOREIGN KEY(repair_order_item_id) REFERENCES repair_order_items(id) ON DELETE RESTRICT) ENGINE=InnoDB;
CREATE TABLE warranty_claim_payments(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,claim_id BIGINT UNSIGNED NOT NULL,payment_method_id BIGINT UNSIGNED NULL,amount DECIMAL(18,2) NOT NULL,payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,reference VARCHAR(150) NULL,notes TEXT NULL,request_key VARCHAR(64) NOT NULL,status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',recorded_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uk_wcp_request(claim_id,request_key),INDEX idx_wcp_claim_date(claim_id,payment_date),CHECK(amount>0),FOREIGN KEY(claim_id) REFERENCES warranty_claims(id) ON DELETE RESTRICT,CONSTRAINT fk_wcp_payment_method FOREIGN KEY(payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,FOREIGN KEY(recorded_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB;
ALTER TABLE invoice_items ADD COLUMN repair_order_item_id BIGINT UNSIGNED NULL,ADD INDEX idx_invoice_item_repair_item(repair_order_item_id),ADD CONSTRAINT fk_invoice_item_repair_item FOREIGN KEY(repair_order_item_id) REFERENCES repair_order_items(id) ON DELETE RESTRICT;

-- ============================================================
-- 12. INDEX COMPLÉMENTAIRES
-- ============================================================

-- Relations différées car les tables référencées sont créées plus loin.
ALTER TABLE vehicles
    ADD CONSTRAINT fk_vehicle_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE diagnostics
    ADD CONSTRAINT fk_diagnostic_technician
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE interventions
    ADD CONSTRAINT fk_intervention_technician
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_vehicle_entry_date ON vehicles(entry_date);
CREATE INDEX idx_vehicle_purchase_price ON vehicles(purchase_price);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_reservation_vehicle_status ON reservations(vehicle_id, status);
CREATE INDEX idx_repair_order_status ON repair_orders(status);
CREATE INDEX idx_repair_order_vehicle ON repair_orders(vehicle_id);
CREATE INDEX idx_part_stock ON parts(current_stock, min_stock);
CREATE INDEX idx_invoice_status_due ON invoices(status, due_date);
CREATE INDEX idx_payment_date ON payments(payment_date);

CREATE TABLE treasury_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concession_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NULL,
  code VARCHAR(50) NOT NULL, name VARCHAR(150) NOT NULL, description VARCHAR(1000) NULL,
  account_type ENUM('CASH','BANK','OTHER') NOT NULL, currency_code CHAR(3) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_account_code (concession_id,code), KEY idx_treasury_account_scope (concession_id,agency_id,is_active),
  CONSTRAINT fk_treasury_account_concession FOREIGN KEY (concession_id) REFERENCES concessions(id), CONSTRAINT fk_treasury_account_agency FOREIGN KEY (agency_id) REFERENCES agencies(id), CONSTRAINT fk_treasury_account_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE treasury_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concession_id BIGINT UNSIGNED NOT NULL, code VARCHAR(50) NOT NULL, name VARCHAR(150) NOT NULL,
  description VARCHAR(1000) NULL, allowed_direction ENUM('IN','OUT','BOTH') NOT NULL DEFAULT 'BOTH', is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_category_code (concession_id,code), KEY idx_treasury_category_scope (concession_id,is_active),
  CONSTRAINT fk_treasury_category_concession FOREIGN KEY (concession_id) REFERENCES concessions(id), CONSTRAINT fk_treasury_category_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE treasury_transfers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, source_account_id BIGINT UNSIGNED NOT NULL, destination_account_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL, currency_code CHAR(3) NOT NULL, value_date DATE NOT NULL, reference VARCHAR(150) NULL, description VARCHAR(1000) NOT NULL,
  reversal_of_id BIGINT UNSIGNED NULL, created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_transfer_reversal (reversal_of_id), KEY idx_treasury_transfer_date (value_date,id),
  CONSTRAINT chk_treasury_transfer_amount CHECK (amount > 0), CONSTRAINT chk_treasury_transfer_accounts CHECK (source_account_id <> destination_account_id),
  CONSTRAINT fk_treasury_transfer_source FOREIGN KEY (source_account_id) REFERENCES treasury_accounts(id), CONSTRAINT fk_treasury_transfer_destination FOREIGN KEY (destination_account_id) REFERENCES treasury_accounts(id),
  CONSTRAINT fk_treasury_transfer_reversal FOREIGN KEY (reversal_of_id) REFERENCES treasury_transfers(id), CONSTRAINT fk_treasury_transfer_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE treasury_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, account_id BIGINT UNSIGNED NOT NULL, direction ENUM('IN','OUT') NOT NULL,
  amount DECIMAL(15,2) NOT NULL, currency_code CHAR(3) NOT NULL, category_id BIGINT UNSIGNED NULL, value_date DATE NOT NULL,
  description VARCHAR(1000) NOT NULL, payment_method_id BIGINT UNSIGNED NULL, reference VARCHAR(150) NULL, counterparty VARCHAR(255) NULL,
  source_type VARCHAR(64) NOT NULL, source_id VARCHAR(190) NOT NULL, event_type VARCHAR(64) NOT NULL, status ENUM('POSTED') NOT NULL DEFAULT 'POSTED',
  transfer_id BIGINT UNSIGNED NULL, reversal_of_id BIGINT UNSIGNED NULL, created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_source_event (source_type,source_id,event_type), UNIQUE KEY uq_treasury_movement_reversal (reversal_of_id),
  KEY idx_treasury_movement_account_date (account_id,value_date,id), KEY idx_treasury_movement_category (category_id,value_date), KEY idx_treasury_movement_status_date (status,value_date,id),
  KEY idx_treasury_movement_source (source_type,source_id), KEY idx_treasury_movement_transfer (transfer_id), CONSTRAINT chk_treasury_movement_amount CHECK (amount > 0),
  CONSTRAINT fk_treasury_movement_account FOREIGN KEY (account_id) REFERENCES treasury_accounts(id), CONSTRAINT fk_treasury_movement_category FOREIGN KEY (category_id) REFERENCES treasury_categories(id),
  CONSTRAINT fk_treasury_movement_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id), CONSTRAINT fk_treasury_movement_transfer FOREIGN KEY (transfer_id) REFERENCES treasury_transfers(id),
  CONSTRAINT fk_treasury_movement_reversal FOREIGN KEY (reversal_of_id) REFERENCES treasury_movements(id), CONSTRAINT fk_treasury_movement_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE treasury_manual_operations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concession_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NULL, account_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('IN','OUT') NOT NULL, amount DECIMAL(15,2) NOT NULL, currency_code CHAR(3) NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL, value_date DATE NOT NULL, description VARCHAR(1000) NOT NULL,
  payment_method_id BIGINT UNSIGNED NULL, reference VARCHAR(150) NULL, counterparty VARCHAR(255) NOT NULL,
  handed_to VARCHAR(255) NULL, client_request_id CHAR(36) NOT NULL, created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_manual_request (created_by,client_request_id),
  KEY idx_treasury_manual_scope_date (concession_id,agency_id,value_date,id), KEY idx_treasury_manual_account (account_id,value_date,id),
  CONSTRAINT chk_treasury_manual_amount CHECK (amount > 0), CONSTRAINT chk_treasury_manual_handed_to CHECK (direction='OUT' OR handed_to IS NULL),
  CONSTRAINT fk_treasury_manual_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_account FOREIGN KEY (account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_category FOREIGN KEY (category_id) REFERENCES treasury_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_manual_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE budget_expense_disbursements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_expense_id BIGINT UNSIGNED NOT NULL, treasury_account_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL, currency_code CHAR(3) NOT NULL, treasury_category_id BIGINT UNSIGNED NOT NULL,
  payment_method_id BIGINT UNSIGNED NULL, beneficiary VARCHAR(255) NOT NULL, handed_to VARCHAR(255) NULL,
  reference VARCHAR(150) NULL, description VARCHAR(1000) NOT NULL, value_date DATE NOT NULL,
  client_request_id CHAR(36) NOT NULL, created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_budget_expense_disbursement_request (created_by,client_request_id),
  KEY idx_budget_expense_disbursement_expense (budget_expense_id,created_at,id), KEY idx_budget_expense_disbursement_account (treasury_account_id,value_date,id),
  CONSTRAINT chk_budget_expense_disbursement_amount CHECK (amount > 0),
  CONSTRAINT fk_budget_expense_disbursement_expense FOREIGN KEY (budget_expense_id) REFERENCES budget_expenses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_expense_disbursement_account FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_expense_disbursement_category FOREIGN KEY (treasury_category_id) REFERENCES treasury_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_expense_disbursement_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_expense_disbursement_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE treasury_flow_configurations (
  concession_id BIGINT UNSIGNED PRIMARY KEY, is_ready BOOLEAN NOT NULL DEFAULT FALSE, activated_at DATETIME NULL, activated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_treasury_flow_config_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_flow_config_activator FOREIGN KEY (activated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE treasury_account_mappings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, concession_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NOT NULL,
  payment_method_id BIGINT UNSIGNED NOT NULL, treasury_account_id BIGINT UNSIGNED NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NOT NULL, updated_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_treasury_mapping_context (agency_id,payment_method_id), KEY idx_treasury_mapping_scope (concession_id,agency_id,is_active),
  CONSTRAINT fk_treasury_mapping_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_account FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_treasury_mapping_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Lot 9 : résolution post-livraison additive. Aucun historique existant n'est réécrit ni déduit.
CREATE TABLE post_delivery_vehicle_returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT UNSIGNED NOT NULL, sale_id BIGINT UNSIGNED NOT NULL, vehicle_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL, concession_id BIGINT UNSIGNED NOT NULL, agency_id BIGINT UNSIGNED NOT NULL,
  return_number VARCHAR(50) NOT NULL,
  request_reason_code ENUM('VEHICLE_DEFECT','NON_CONFORMITY','COMMERCIAL_AGREEMENT','CONTRACTUAL_WITHDRAWAL','OTHER') NOT NULL,
  request_description TEXT NOT NULL, requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, requested_by BIGINT UNSIGNED NOT NULL,
  status ENUM('REQUESTED','INSPECTED','APPROVED','REJECTED','FINANCIALLY_RESOLVED','VEHICLE_RECEIVED','STOCK_DECIDED','CLOSED') NOT NULL DEFAULT 'REQUESTED',
  customer_name_snapshot VARCHAR(255) NOT NULL, vehicle_label_snapshot VARCHAR(255) NOT NULL, vin_snapshot VARCHAR(50) NOT NULL,
  sale_number_snapshot VARCHAR(50) NOT NULL, delivery_number_snapshot VARCHAR(50) NOT NULL, currency_code CHAR(3) NOT NULL,
  delivery_mileage_snapshot INT UNSIGNED NULL,
  inspected_at DATETIME NULL, inspected_by BIGINT UNSIGNED NULL, return_mileage INT UNSIGNED NULL,
  general_condition VARCHAR(100) NULL, damages TEXT NULL, missing_items TEXT NULL, inspection_notes TEXT NULL,
  decision_at DATETIME NULL, decided_by BIGINT UNSIGNED NULL, decision_comment TEXT NULL,
  gross_credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0, retained_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  credited_amount DECIMAL(18,2) NOT NULL DEFAULT 0, refundable_cash_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  refunded_amount DECIMAL(18,2) NOT NULL DEFAULT 0, financially_resolved_at DATETIME NULL, financially_resolved_by BIGINT UNSIGNED NULL,
  received_at DATETIME NULL, received_by BIGINT UNSIGNED NULL, received_vehicle_location_id BIGINT UNSIGNED NULL, reception_notes TEXT NULL,
  stock_decision ENUM('RESTOCK_USED','HOLD','RECONDITION') NULL, stock_decided_at DATETIME NULL, stock_decided_by BIGINT UNSIGNED NULL,
  stock_vehicle_location_id BIGINT UNSIGNED NULL, stock_notes TEXT NULL, closed_at DATETIME NULL, closed_by BIGINT UNSIGNED NULL,
  request_id CHAR(36) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_return_delivery (delivery_id), UNIQUE KEY uq_vehicle_return_number (return_number),
  UNIQUE KEY uq_vehicle_return_request (requested_by,request_id), KEY idx_vehicle_return_scope_status (concession_id,agency_id,status,id),
  KEY idx_vehicle_return_sale (sale_id,id), KEY idx_vehicle_return_vehicle (vehicle_id,id),
  CONSTRAINT chk_vehicle_return_amounts CHECK (gross_credit_amount>=0 AND retained_amount>=0 AND credited_amount>=0 AND refundable_cash_amount>=0 AND refunded_amount>=0 AND retained_amount+credited_amount<=gross_credit_amount+0.01 AND refunded_amount<=refundable_cash_amount+0.01),
  CONSTRAINT chk_vehicle_return_mileage CHECK (return_mileage IS NULL OR return_mileage>=delivery_mileage_snapshot),
  CONSTRAINT fk_vehicle_return_delivery FOREIGN KEY(delivery_id) REFERENCES deliveries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_sale FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_vehicle FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_concession FOREIGN KEY(concession_id) REFERENCES concessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_agency FOREIGN KEY(agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_requester FOREIGN KEY(requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_inspector FOREIGN KEY(inspected_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_financial FOREIGN KEY(financially_resolved_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_receiver FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_received_location FOREIGN KEY(received_vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_stock_decider FOREIGN KEY(stock_decided_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_stock_location FOREIGN KEY(stock_vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_closer FOREIGN KEY(closed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE post_delivery_vehicle_return_deductions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL, category VARCHAR(80) NOT NULL,
  label VARCHAR(180) NOT NULL, description VARCHAR(1000) NOT NULL, amount DECIMAL(18,2) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, client_request_id CHAR(36) NOT NULL,
  UNIQUE KEY uq_vehicle_return_deduction_request (return_id,client_request_id), KEY idx_vehicle_return_deduction (return_id,id),
  CONSTRAINT chk_vehicle_return_deduction_amount CHECK(amount>0),
  CONSTRAINT fk_vehicle_return_deduction_return FOREIGN KEY(return_id) REFERENCES post_delivery_vehicle_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_deduction_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE post_delivery_vehicle_return_resolution_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL, invoice_id BIGINT UNSIGNED NOT NULL,
  resolution_action ENUM('CREDIT','KEEP') NOT NULL, invoice_total_snapshot DECIMAL(18,2) NOT NULL, prior_credit_snapshot DECIMAL(18,2) NOT NULL,
  gross_credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0, retained_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0, credit_note_id BIGINT UNSIGNED NULL, rationale VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_return_resolution_invoice(return_id,invoice_id), UNIQUE KEY uq_vehicle_return_credit_note(credit_note_id),
  CONSTRAINT chk_vehicle_return_resolution_amounts CHECK(invoice_total_snapshot>=0 AND prior_credit_snapshot>=0 AND gross_credit_amount>=0 AND retained_amount>=0 AND credit_amount>=0 AND retained_amount+credit_amount<=gross_credit_amount+0.01),
  CONSTRAINT fk_vehicle_return_resolution_return FOREIGN KEY(return_id) REFERENCES post_delivery_vehicle_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_resolution_invoice FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_resolution_credit FOREIGN KEY(credit_note_id) REFERENCES credit_notes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE post_delivery_vehicle_return_refunds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL, payment_refund_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_vehicle_return_payment_refund(payment_refund_id),
  KEY idx_vehicle_return_refund(return_id,id),
  CONSTRAINT fk_vehicle_return_refund_return FOREIGN KEY(return_id) REFERENCES post_delivery_vehicle_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_refund_payment FOREIGN KEY(payment_refund_id) REFERENCES payment_refunds(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE post_delivery_vehicle_return_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL, event_type VARCHAR(80) NOT NULL,
  old_status VARCHAR(40) NULL, new_status VARCHAR(40) NULL, details JSON NULL, performed_by BIGINT UNSIGNED NOT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY idx_vehicle_return_event(return_id,occurred_at,id),
  CONSTRAINT fk_vehicle_return_event_return FOREIGN KEY(return_id) REFERENCES post_delivery_vehicle_returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_return_event_user FOREIGN KEY(performed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Le baseline représente directement l'état consolidé au niveau 066.
INSERT INTO schema_migrations(version,name,checksum)
VALUES (66,'baseline_001_066',REPEAT('0',64));
