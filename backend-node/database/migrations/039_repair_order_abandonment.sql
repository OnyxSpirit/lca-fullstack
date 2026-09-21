ALTER TABLE repair_orders
    MODIFY COLUMN status ENUM('planned','received','diagnosis','waiting_approval','in_progress','quality_control','ready','invoiced','delivered','closed','cancelled','abandonment_pending','abandoned') NOT NULL DEFAULT 'planned',
    ADD COLUMN abandonment_reason_code VARCHAR(50) NULL,
    ADD COLUMN abandonment_reason VARCHAR(500) NULL,
    ADD COLUMN abandonment_requested_at DATETIME NULL,
    ADD COLUMN abandonment_requested_by BIGINT UNSIGNED NULL,
    ADD COLUMN abandoned_at DATETIME NULL,
    ADD COLUMN abandoned_by BIGINT UNSIGNED NULL,
    ADD CONSTRAINT fk_ro_abandonment_requested_by FOREIGN KEY (abandonment_requested_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_ro_abandoned_by FOREIGN KEY (abandoned_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE repair_order_handovers
    ADD COLUMN handover_type ENUM('repair','abandonment') NOT NULL DEFAULT 'repair';

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('service','abandon','service.order.abandon','Abandonner un ordre de réparation','SAV & Atelier','Suspendre, régulariser et finaliser un abandon client',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;
