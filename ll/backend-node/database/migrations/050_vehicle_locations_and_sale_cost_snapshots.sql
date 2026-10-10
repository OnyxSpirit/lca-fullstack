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

INSERT INTO vehicle_locations(agency_id,name,type,is_active,legacy_location_id)
SELECT DISTINCT l.agency_id,l.name,IF(l.type='showroom','SHOWROOM','PARC'),l.is_active,l.id
FROM locations l JOIN vehicles v ON v.location_id=l.id
WHERE l.type IN('showroom','yard')
ON DUPLICATE KEY UPDATE name=VALUES(name),type=VALUES(type),is_active=VALUES(is_active);

ALTER TABLE vehicles
    ADD COLUMN vehicle_location_id BIGINT UNSIGNED NULL AFTER location_id,
    ADD INDEX idx_vehicle_vehicle_location (vehicle_location_id),
    ADD CONSTRAINT fk_vehicle_dedicated_location FOREIGN KEY (vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE vehicles v JOIN vehicle_locations vl ON vl.legacy_location_id=v.location_id
SET v.vehicle_location_id=vl.id;

ALTER TABLE vehicle_movements
    ADD COLUMN from_vehicle_location_id BIGINT UNSIGNED NULL AFTER from_location_id,
    ADD COLUMN to_vehicle_location_id BIGINT UNSIGNED NULL AFTER to_location_id,
    ADD INDEX idx_vm_from_vehicle_location (from_vehicle_location_id),
    ADD INDEX idx_vm_to_vehicle_location (to_vehicle_location_id),
    ADD CONSTRAINT fk_vm_from_vehicle_location FOREIGN KEY (from_vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_vm_to_vehicle_location FOREIGN KEY (to_vehicle_location_id) REFERENCES vehicle_locations(id) ON DELETE SET NULL;

UPDATE vehicle_movements vm
LEFT JOIN vehicle_locations fvl ON fvl.legacy_location_id=vm.from_location_id
LEFT JOIN vehicle_locations tvl ON tvl.legacy_location_id=vm.to_location_id
SET vm.from_vehicle_location_id=fvl.id,vm.to_vehicle_location_id=tvl.id;

ALTER TABLE sale_items
    ADD COLUMN purchase_price_snapshot DECIMAL(18,2) NULL,
    ADD COLUMN refurbishment_cost_snapshot DECIMAL(18,2) NULL,
    ADD COLUMN transport_cost_snapshot DECIMAL(18,2) NULL,
    ADD COLUMN administrative_cost_snapshot DECIMAL(18,2) NULL,
    ADD COLUMN additional_costs_snapshot DECIMAL(18,2) NULL,
    ADD COLUMN total_cost_snapshot DECIMAL(18,2) NULL;

INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active) VALUES
('vehicles','view','vehicles.assignments.view','Voir les affectations véhicules','Véhicules','Consulter les Parcs et Showrooms autorisés',TRUE),
('vehicles','manage','vehicles.assignments.manage','Gérer les affectations véhicules','Véhicules','Créer, renommer et activer les Parcs et Showrooms',TRUE);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r JOIN permissions p ON p.code IN('vehicles.assignments.view','vehicles.assignments.manage')
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
ON DUPLICATE KEY UPDATE scope='GLOBAL';
