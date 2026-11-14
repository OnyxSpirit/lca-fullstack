-- Clôture CRM / Client 360 / Stock : ajouts strictement additifs.

ALTER TABLE customer_contacts
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER is_primary,
  ADD COLUMN deactivated_at DATETIME NULL AFTER is_active,
  ADD COLUMN deactivated_by BIGINT UNSIGNED NULL AFTER deactivated_at,
  ADD COLUMN deactivation_reason VARCHAR(500) NULL AFTER deactivated_by,
  ADD COLUMN reactivated_at DATETIME NULL AFTER deactivation_reason,
  ADD COLUMN reactivated_by BIGINT UNSIGNED NULL AFTER reactivated_at,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD KEY idx_customer_contacts_state (customer_id,is_active),
  ADD CONSTRAINT fk_customer_contact_deactivated_by FOREIGN KEY(deactivated_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_customer_contact_reactivated_by FOREIGN KEY(reactivated_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE customer_contact_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  action ENUM('CREATED','UPDATED','DEACTIVATED','REACTIVATED') NOT NULL,
  snapshot JSON NOT NULL,
  reason VARCHAR(500) NULL,
  performed_by BIGINT UNSIGNED NULL,
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_contact_history_contact (contact_id,performed_at,id),
  KEY idx_contact_history_customer (customer_id,performed_at,id),
  CONSTRAINT fk_contact_history_contact FOREIGN KEY(contact_id) REFERENCES customer_contacts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contact_history_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contact_history_user FOREIGN KEY(performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE leads
  ADD COLUMN archived_at DATETIME NULL AFTER converted_at,
  ADD COLUMN archived_by BIGINT UNSIGNED NULL AFTER archived_at,
  ADD COLUMN archive_reason VARCHAR(500) NULL AFTER archived_by,
  ADD COLUMN reactivated_at DATETIME NULL AFTER archive_reason,
  ADD COLUMN reactivated_by BIGINT UNSIGNED NULL AFTER reactivated_at,
  ADD KEY idx_leads_agency_archived (agency_id,archived_at),
  ADD CONSTRAINT fk_lead_archived_by FOREIGN KEY(archived_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_lead_reactivated_by FOREIGN KEY(reactivated_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE vehicle_interagency_transfers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  vin_snapshot VARCHAR(17) NULL,
  source_agency_id BIGINT UNSIGNED NOT NULL,
  destination_agency_id BIGINT UNSIGNED NOT NULL,
  source_location_id BIGINT UNSIGNED NULL,
  destination_location_id BIGINT UNSIGNED NULL,
  original_vehicle_status VARCHAR(50) NOT NULL,
  status ENUM('PENDING_SHIPMENT','IN_TRANSIT','RECEIVED','CANCELLED','RETURN_REQUIRED') NOT NULL DEFAULT 'PENDING_SHIPMENT',
  reason VARCHAR(255) NOT NULL,
  external_reference VARCHAR(120) NULL,
  observations TEXT NULL,
  initiated_by BIGINT UNSIGNED NOT NULL,
  initiated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  shipped_by BIGINT UNSIGNED NULL,
  shipped_at DATETIME NULL,
  received_by BIGINT UNSIGNED NULL,
  received_at DATETIME NULL,
  cancelled_by BIGINT UNSIGNED NULL,
  cancelled_at DATETIME NULL,
  cancellation_reason VARCHAR(500) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  active_vehicle_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status IN('PENDING_SHIPMENT','IN_TRANSIT','RETURN_REQUIRED') THEN vehicle_id ELSE NULL END) STORED,
  UNIQUE KEY uq_vehicle_active_interagency_transfer (active_vehicle_id),
  KEY idx_transfer_source_status (source_agency_id,status,initiated_at),
  KEY idx_transfer_destination_status (destination_agency_id,status,initiated_at),
  CONSTRAINT chk_transfer_distinct_agencies CHECK (source_agency_id<>destination_agency_id),
  CONSTRAINT fk_transfer_vehicle FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_source_agency FOREIGN KEY(source_agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_destination_agency FOREIGN KEY(destination_agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_source_location FOREIGN KEY(source_location_id) REFERENCES vehicle_locations(id) ON DELETE SET NULL,
  CONSTRAINT fk_transfer_destination_location FOREIGN KEY(destination_location_id) REFERENCES vehicle_locations(id) ON DELETE SET NULL,
  CONSTRAINT fk_transfer_initiator FOREIGN KEY(initiated_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_shipper FOREIGN KEY(shipped_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_transfer_receiver FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_transfer_canceller FOREIGN KEY(cancelled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE vehicle_interagency_transfer_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transfer_id BIGINT UNSIGNED NOT NULL,
  old_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NOT NULL,
  reason VARCHAR(500) NULL,
  performed_by BIGINT UNSIGNED NULL,
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_transfer_history (transfer_id,performed_at,id),
  CONSTRAINT fk_transfer_history_transfer FOREIGN KEY(transfer_id) REFERENCES vehicle_interagency_transfers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_history_user FOREIGN KEY(performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
