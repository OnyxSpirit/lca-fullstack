ALTER TABLE vehicles
    ADD COLUMN reception_defect_present BOOLEAN NOT NULL DEFAULT FALSE AFTER minimum_price,
    ADD COLUMN reception_defect_description TEXT NULL AFTER reception_defect_present,
    ADD COLUMN reception_initial_sale_price DECIMAL(18,2) NULL AFTER reception_defect_description,
    ADD COLUMN reception_defect_discount DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER reception_initial_sale_price,
    ADD COLUMN reception_defect_discount_reason TEXT NULL AFTER reception_defect_discount,
    ADD CONSTRAINT chk_vehicle_reception_defect_discount_non_negative CHECK (reception_defect_discount >= 0),
    ADD CONSTRAINT chk_vehicle_reception_defect_consistency CHECK (
        (reception_defect_present = FALSE
            AND reception_defect_description IS NULL
            AND reception_defect_discount = 0
            AND reception_defect_discount_reason IS NULL)
        OR
        (reception_defect_present = TRUE
            AND reception_defect_description IS NOT NULL
            AND CHAR_LENGTH(TRIM(reception_defect_description)) > 0
            AND reception_initial_sale_price IS NOT NULL
            AND reception_initial_sale_price > reception_defect_discount
            AND (reception_defect_discount = 0 OR (
                reception_defect_discount_reason IS NOT NULL
                AND CHAR_LENGTH(TRIM(reception_defect_discount_reason)) > 0
            )))
    );
