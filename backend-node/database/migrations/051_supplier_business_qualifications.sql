ALTER TABLE suppliers
    ADD COLUMN is_parts_supplier BOOLEAN NOT NULL DEFAULT TRUE AFTER is_active,
    ADD COLUMN is_vehicle_supplier BOOLEAN NOT NULL DEFAULT FALSE AFTER is_parts_supplier,
    ADD INDEX idx_suppliers_business_active (is_parts_supplier,is_vehicle_supplier,is_active);
