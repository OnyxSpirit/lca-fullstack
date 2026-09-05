-- ============================================================
-- ERP / CRM CONCESSION AUTOMOBILE
-- Schéma MySQL 8.0+
-- Source : Cahier des charges — Plateforme intégrée de gestion
-- d'une concession automobile, version 1.0
--
-- IMPORTANT :
-- - Les règles fiscales/comptables restent configurables.
-- - Ce schéma couvre la facturation/encaissement et l'intégration
--   comptable, mais ne constitue pas un plan comptable complet.
-- - Les suppressions en cascade sont limitées volontairement sur
--   les données transactionnelles afin de préserver l'historique.
-- ============================================================

CREATE DATABASE IF NOT EXISTS concession_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE concession_erp;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. ORGANISATION / MULTI-AGENCES
-- ============================================================

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS showroom_test_drives;
DROP TABLE IF EXISTS showroom_visits;

DROP TABLE IF EXISTS delivery_signatures;
DROP TABLE IF EXISTS delivery_documents;
DROP TABLE IF EXISTS delivery_checklists;
DROP TABLE IF EXISTS delivery_status_history;
DROP TABLE IF EXISTS delivery_checklist_templates;
DROP TABLE IF EXISTS deliveries;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS credit_notes;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payment_methods;

DROP TABLE IF EXISTS time_entries;
DROP TABLE IF EXISTS work_sessions;
DROP TABLE IF EXISTS workshop_schedule_history;
DROP TABLE IF EXISTS technician_unavailabilities;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS workshop_bays;
DROP TABLE IF EXISTS technicians;

DROP TABLE IF EXISTS part_reservations;
DROP TABLE IF EXISTS part_movements;
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS parts;
DROP TABLE IF EXISTS part_categories;
DROP TABLE IF EXISTS suppliers;

DROP TABLE IF EXISTS repair_order_items;
DROP TABLE IF EXISTS interventions;
DROP TABLE IF EXISTS diagnostics;
DROP TABLE IF EXISTS repair_approvals;
DROP TABLE IF EXISTS vehicle_reception_inspections;
DROP TABLE IF EXISTS repair_order_status_history;
DROP TABLE IF EXISTS repair_orders;
DROP TABLE IF EXISTS service_appointments;

DROP TABLE IF EXISTS trade_ins;
DROP TABLE IF EXISTS financing;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS quotation_items;

DROP TABLE IF EXISTS vehicle_price_history;
DROP TABLE IF EXISTS vehicle_feature_assignments;
DROP TABLE IF EXISTS vehicle_features;
DROP TABLE IF EXISTS vehicle_images;
DROP TABLE IF EXISTS vehicle_status_history;
DROP TABLE IF EXISTS vehicle_movements;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS versions;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS brands;

DROP TABLE IF EXISTS follow_ups;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS customer_contacts;
DROP TABLE IF EXISTS customers;

DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS agencies;
DROP TABLE IF EXISTS concessions;
DROP TABLE IF EXISTS groups_company;

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
    address TEXT NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'XAF',
    timezone VARCHAR(80) NOT NULL DEFAULT 'Africa/Brazzaville',
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

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(80) NOT NULL UNIQUE,
    description TEXT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(80) NOT NULL,
    action ENUM(
        'view','create','update','delete','validate',
        'cancel','export','print','approve','assign'
    ) NOT NULL,
    code VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NULL
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
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
    INDEX idx_customer_email (email),
    INDEX idx_customer_phone (phone),
    INDEX idx_customer_agency (agency_id),
    INDEX idx_customer_assigned (assigned_user_id),
    INDEX idx_customer_classification (classification),
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

CREATE TABLE vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    version_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
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
    CONSTRAINT fk_vehicle_version
        FOREIGN KEY (version_id) REFERENCES versions(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_agency
        FOREIGN KEY (agency_id) REFERENCES agencies(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_location
        FOREIGN KEY (location_id) REFERENCES locations(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    from_location_id BIGINT UNSIGNED NULL,
    to_location_id BIGINT UNSIGNED NULL,
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
    CONSTRAINT fk_vm_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vm_from_location FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    CONSTRAINT fk_vm_to_location FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE SET NULL,
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
    deposit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(18,2) NOT NULL DEFAULT 0,
    sold_at DATETIME NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sale_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sale_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
    CONSTRAINT fk_sale_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    CONSTRAINT fk_sale_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sale_salesperson FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sale_financing FOREIGN KEY (financing_id) REFERENCES financing(id) ON DELETE SET NULL,
    CONSTRAINT fk_sale_trade_in FOREIGN KEY (trade_in_id) REFERENCES trade_ins(id) ON DELETE SET NULL
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
    outcome ENUM('pending','lead_created','quotation','sale','no_interest','follow_up') NOT NULL DEFAULT 'pending',
    arrival_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_at DATETIME NULL,
    completed_at DATETIME NULL,
    cancellation_reason VARCHAR(255) NULL,
    notes TEXT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_showroom_agency_status_arrival (agency_id,status,arrival_at),
    INDEX idx_showroom_phone (phone),
    INDEX idx_showroom_lead (lead_id),
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
        'delivered','closed','cancelled'
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
    CONSTRAINT fk_ro_appointment FOREIGN KEY (appointment_id) REFERENCES service_appointments(id) ON DELETE SET NULL,
    CONSTRAINT fk_ro_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ro_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ro_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ro_advisor FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE SET NULL
    ,CONSTRAINT fk_ro_courtesy_vehicle FOREIGN KEY (courtesy_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    ,CONSTRAINT fk_ro_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

CREATE TABLE repair_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_order_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NULL,
    part_stock_id BIGINT UNSIGNED NULL,
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
    CONSTRAINT fk_roi_ro FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_roi_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE SET NULL,
    CONSTRAINT fk_roi_stock FOREIGN KEY (part_stock_id) REFERENCES part_stocks(id) ON DELETE RESTRICT,
    CONSTRAINT fk_roi_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_roi_intervention FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL
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
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT,
    FOREIGN KEY (agency_id) REFERENCES agencies(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (part_stock_id) REFERENCES part_stocks(id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
    item_name VARCHAR(200) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by BIGINT UNSIGNED NULL,
    completed_at DATETIME NULL,
    notes TEXT NULL,
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

INSERT INTO delivery_checklist_templates(agency_id,item_name,category,is_required,sort_order) VALUES
(NULL,'Nettoyage intérieur','preparation',TRUE,10),
(NULL,'Nettoyage extérieur','preparation',TRUE,20),
(NULL,'Contrôle esthétique','quality',TRUE,30),
(NULL,'Contrôle mécanique','quality',TRUE,40),
(NULL,'Documents administratifs complets','documents',TRUE,50),
(NULL,'Accessoires installés','preparation',TRUE,60),
(NULL,'Carburant ou batterie chargé','preparation',TRUE,70),
(NULL,'Double des clés remis','handover',TRUE,80),
(NULL,'Présentation du véhicule au client','handover',TRUE,90),
(NULL,'Validation qualité finale','quality',TRUE,100);

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
    CONSTRAINT fk_invoice_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_item_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_item_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE SET NULL
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
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_notification_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_notification_template FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uploaded_by BIGINT UNSIGNED NULL,
    document_type VARCHAR(100) NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NULL,
    file_size BIGINT UNSIGNED NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    file_hash CHAR(64) NULL,
    expires_at DATE NULL,
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
    CONSTRAINT fk_document_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_archived_by FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_parent FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scope_type ENUM('global','group','concession','agency','department','user') NOT NULL DEFAULT 'global',
    scope_id BIGINT UNSIGNED NULL,
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

-- ============================================================
-- 13. DONNÉES DE PARAMÉTRAGE MINIMALES
-- ============================================================

INSERT INTO payment_methods (name, code, requires_reference) VALUES
('Espèces', 'CASH', FALSE),
('Carte bancaire', 'CARD', TRUE),
('Virement bancaire', 'BANK_TRANSFER', TRUE),
('Chèque', 'CHECK', TRUE),
('Mobile Money', 'MOBILE_MONEY', TRUE),
('Financement bancaire', 'BANK_FINANCING', TRUE);

INSERT INTO roles (name, code, description, is_system) VALUES
('Super Administrateur', 'SUPER_ADMIN', 'Configuration globale et supervision', TRUE),
('Direction', 'DIRECTOR', 'Pilotage et reporting', TRUE),
('Responsable commercial', 'SALES_MANAGER', 'Gestion du pipeline et équipe commerciale', TRUE),
('Commercial', 'SALES_AGENT', 'Prospection et ventes', TRUE),
('Réceptionniste', 'RECEPTIONIST', 'Accueil et file d’attente showroom', TRUE),
('Responsable SAV', 'SERVICE_MANAGER', 'Gestion SAV', TRUE),
('Conseiller SAV', 'SERVICE_ADVISOR', 'Réception et suivi des OR', TRUE),
('Chef d’atelier', 'WORKSHOP_MANAGER', 'Planning et supervision atelier', TRUE),
('Technicien', 'TECHNICIAN', 'Interventions atelier', TRUE),
('Responsable pièces', 'PARTS_MANAGER', 'Gestion du magasin pièces', TRUE),
('Magasinier', 'WAREHOUSE_CLERK', 'Entrées/sorties de pièces', TRUE),
('Responsable livraison', 'DELIVERY_MANAGER', 'Préparation et remise des véhicules', TRUE),
('Comptable', 'ACCOUNTANT', 'Facturation et encaissements', TRUE);

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;

-- Vérification rapide :
-- SELECT TABLE_NAME
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'concession_erp'
-- ORDER BY TABLE_NAME;
