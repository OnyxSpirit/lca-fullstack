-- Référentiel dynamique des barèmes atelier : concession + surcharges agence.
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

ALTER TABLE repair_order_estimate_items
    ADD COLUMN labor_rate_id BIGINT UNSIGNED NULL AFTER part_id,
    ADD COLUMN rate_code_snapshot VARCHAR(50) NULL AFTER labor_rate_id,
    ADD COLUMN rate_label_snapshot VARCHAR(150) NULL AFTER rate_code_snapshot,
    ADD INDEX idx_repair_estimate_labor_rate (labor_rate_id),
    ADD CONSTRAINT fk_repair_estimate_labor_rate FOREIGN KEY (labor_rate_id) REFERENCES workshop_labor_rates(id) ON DELETE SET NULL;

ALTER TABLE repair_order_items
    ADD COLUMN labor_rate_id BIGINT UNSIGNED NULL AFTER part_stock_id,
    ADD COLUMN rate_code_snapshot VARCHAR(50) NULL AFTER labor_rate_id,
    ADD COLUMN rate_label_snapshot VARCHAR(150) NULL AFTER rate_code_snapshot,
    ADD INDEX idx_repair_item_labor_rate (labor_rate_id),
    ADD CONSTRAINT fk_repair_item_labor_rate FOREIGN KEY (labor_rate_id) REFERENCES workshop_labor_rates(id) ON DELETE SET NULL;

-- Les valeurs concession réellement configurées sont prioritaires. Une valeur
-- absente ou non numérique retombe seulement alors sur le défaut historique.
INSERT INTO workshop_labor_rates(concession_id,agency_id,parent_rate_id,code,label,hourly_rate,is_active,display_order)
SELECT c.id,NULL,NULL,seed.code,seed.label,
       CASE
         WHEN JSON_UNQUOTE(s.setting_value) REGEXP '^[0-9]+([.][0-9]+)?$'
           THEN CAST(JSON_UNQUOTE(s.setting_value) AS DECIMAL(18,2))
         ELSE seed.default_rate
       END,
       TRUE,seed.display_order
FROM concessions c
JOIN (
    SELECT 'T1' code,'Entretien rapide' label,35000.00 default_rate,10 display_order,'workshop.rate_t1' setting_key
    UNION ALL SELECT 'T2','Mécanique',45000.00,20,'workshop.rate_t2'
    UNION ALL SELECT 'T3','Diagnostic et électronique',55000.00,30,'workshop.rate_t3'
    UNION ALL SELECT 'T4','Carrosserie et peinture',45000.00,40,'workshop.rate_t4'
) seed ON TRUE
LEFT JOIN settings s ON s.scope_type='concession' AND s.scope_id=c.id AND s.setting_key=seed.setting_key
ON DUPLICATE KEY UPDATE id=workshop_labor_rates.id;
