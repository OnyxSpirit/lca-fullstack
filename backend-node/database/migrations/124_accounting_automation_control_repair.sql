-- Réparation additive de la dérive historique de 121_accounting_automation.sql.
-- Certaines bases ont appliqué la version antérieure de 121, sans ce contrôle.
CREATE TABLE IF NOT EXISTS accounting_automation_control(
 id TINYINT UNSIGNED PRIMARY KEY,
 started_at DATETIME NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT chk_accounting_automation_singleton CHECK(id=1)
);

INSERT INTO accounting_automation_control(id,started_at,enabled)
VALUES(1,NOW(),TRUE)
ON DUPLICATE KEY UPDATE id=VALUES(id);
