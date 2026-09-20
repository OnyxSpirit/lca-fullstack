-- Retries of the same OR intervention, reservation, or billable line retain one record.
ALTER TABLE interventions ADD COLUMN request_key VARCHAR(64) NULL,
    ADD UNIQUE KEY uk_intervention_request (repair_order_id,request_key);
ALTER TABLE part_reservations ADD COLUMN request_key VARCHAR(64) NULL,
    ADD UNIQUE KEY uk_reservation_request (repair_order_id,request_key);
ALTER TABLE repair_order_items ADD COLUMN request_key VARCHAR(64) NULL,
    ADD UNIQUE KEY uk_repair_item_request (repair_order_id,request_key);
