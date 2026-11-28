ALTER TABLE vehicle_orders
  MODIFY COLUMN commercial_model_id BIGINT UNSIGNED NULL,
  ADD COLUMN brand_id BIGINT UNSIGNED NULL AFTER commercial_model_id,
  ADD COLUMN model_id BIGINT UNSIGNED NULL AFTER brand_id,
  ADD COLUMN version_id BIGINT UNSIGNED NULL AFTER model_id,
  ADD COLUMN illustration_path VARCHAR(500) NULL AFTER quantity_ordered,
  ADD COLUMN illustration_mime_type VARCHAR(120) NULL AFTER illustration_path,
  ADD COLUMN illustration_file_size BIGINT UNSIGNED NULL AFTER illustration_mime_type,
  ADD KEY idx_vehicle_order_brand_model (brand_id,model_id,version_id),
  ADD CONSTRAINT fk_vehicle_order_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_vehicle_order_model_reference FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_vehicle_order_version_reference FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_vehicle_order_reference CHECK (commercial_model_id IS NOT NULL OR (brand_id IS NOT NULL AND model_id IS NOT NULL));

UPDATE vehicle_orders vo
JOIN commercial_models cm ON cm.id=vo.commercial_model_id
JOIN versions v ON v.id=cm.version_id
JOIN models m ON m.id=v.model_id
SET vo.brand_id=m.brand_id,vo.model_id=m.id,vo.version_id=v.id
WHERE vo.brand_id IS NULL OR vo.model_id IS NULL;
