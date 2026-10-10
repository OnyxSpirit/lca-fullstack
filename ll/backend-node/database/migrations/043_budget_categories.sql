CREATE TABLE budget_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concession_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_budget_category_concession_code (concession_id,code),
    UNIQUE KEY uk_budget_category_concession_name (concession_id,name),
    INDEX idx_budget_category_active (concession_id,is_active,name),
    CONSTRAINT fk_budget_category_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_budget_category_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_budget_category_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE budgets
    ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER category,
    ADD INDEX idx_budget_category (category_id),
    ADD CONSTRAINT fk_budget_category FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE budget_expenses
    ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER category,
    ADD INDEX idx_budget_expense_category (category_id,expense_date),
    ADD CONSTRAINT fk_budget_expense_category FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- BINARY conserve chaque libellé historique exact. La contrainte UNIQUE sur
-- (concession_id,name), sous la collation métier, fait échouer explicitement
-- toute collision ambiguë de casse, accents ou espaces après TRIM.
INSERT INTO budget_categories(concession_id,code,name,is_active)
SELECT legacy.concession_id,
       CONCAT('LEGACY_',LEFT(SHA2(CONCAT(legacy.concession_id,':',HEX(legacy.raw_name)),256),24)),
       TRIM(legacy.raw_name),
       TRUE
FROM (
    SELECT DISTINCT source.concession_id,source.raw_name
    FROM (
        SELECT COALESCE(b.concession_id,a.concession_id) concession_id,
               b.category COLLATE utf8mb4_bin raw_name
        FROM budgets b
        LEFT JOIN agencies a ON a.id=b.agency_id
        WHERE b.category IS NOT NULL AND TRIM(b.category)<>''
        UNION ALL
        SELECT COALESCE(b.concession_id,a.concession_id) concession_id,
               e.category COLLATE utf8mb4_bin raw_name
        FROM budget_expenses e
        JOIN budgets b ON b.id=e.budget_id
        LEFT JOIN agencies a ON a.id=b.agency_id
        WHERE e.category IS NOT NULL AND TRIM(e.category)<>''
    ) source
    WHERE source.concession_id IS NOT NULL
) legacy;

UPDATE budgets b
LEFT JOIN agencies a ON a.id=b.agency_id
JOIN budget_categories c
  ON c.concession_id=COALESCE(b.concession_id,a.concession_id)
 AND c.code=CONCAT('LEGACY_',LEFT(SHA2(CONCAT(c.concession_id,':',HEX(b.category COLLATE utf8mb4_bin)),256),24))
SET b.category_id=c.id
WHERE b.category_id IS NULL AND b.category IS NOT NULL AND TRIM(b.category)<>'';

UPDATE budget_expenses e
JOIN budgets b ON b.id=e.budget_id
LEFT JOIN agencies a ON a.id=b.agency_id
JOIN budget_categories c
  ON c.concession_id=COALESCE(b.concession_id,a.concession_id)
 AND c.code=CONCAT('LEGACY_',LEFT(SHA2(CONCAT(c.concession_id,':',HEX(e.category COLLATE utf8mb4_bin)),256),24))
SET e.category_id=c.id
WHERE e.category_id IS NULL AND e.category IS NOT NULL AND TRIM(e.category)<>'';

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('hr','view','hr.budget.category.view','Voir les catégories budgétaires','RH & Administration','Consulter les catégories budgétaires de son périmètre',TRUE),
('hr','manage','hr.budget.category.manage','Gérer les catégories budgétaires','RH & Administration','Créer, modifier, activer et désactiver les catégories budgétaires de son périmètre',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL' FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
  AND p.code IN('hr.budget.category.view','hr.budget.category.manage')
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
