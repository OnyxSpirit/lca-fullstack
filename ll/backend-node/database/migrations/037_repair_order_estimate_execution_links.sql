-- Continuité additive entre chiffrage accepté et exécution réelle.
ALTER TABLE interventions
    ADD COLUMN estimate_item_id BIGINT UNSIGNED NULL,
    ADD UNIQUE KEY uk_intervention_estimate_item (estimate_item_id),
    ADD CONSTRAINT fk_intervention_estimate_item FOREIGN KEY (estimate_item_id) REFERENCES repair_order_estimate_items(id) ON DELETE RESTRICT;

ALTER TABLE part_reservations
    ADD COLUMN estimate_item_id BIGINT UNSIGNED NULL,
    ADD COLUMN consumed_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD UNIQUE KEY uk_reservation_estimate_item (estimate_item_id),
    ADD CONSTRAINT fk_reservation_estimate_item FOREIGN KEY (estimate_item_id) REFERENCES repair_order_estimate_items(id) ON DELETE RESTRICT;

ALTER TABLE repair_order_items
    ADD COLUMN estimate_item_id BIGINT UNSIGNED NULL,
    ADD UNIQUE KEY uk_repair_item_estimate (estimate_item_id),
    ADD CONSTRAINT fk_repair_item_estimate FOREIGN KEY (estimate_item_id) REFERENCES repair_order_estimate_items(id) ON DELETE RESTRICT;
