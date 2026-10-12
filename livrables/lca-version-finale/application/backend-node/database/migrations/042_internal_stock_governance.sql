CREATE TABLE internal_stock_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concession_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_internal_stock_category_concession_code (concession_id,code),
    UNIQUE KEY uk_internal_stock_category_concession_name (concession_id,name),
    INDEX idx_internal_stock_category_active (concession_id,is_active,name),
    CONSTRAINT fk_internal_stock_category_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE internal_stock_items
    ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER category,
    ADD INDEX idx_internal_stock_category (category_id),
    ADD CONSTRAINT fk_internal_stock_item_category FOREIGN KEY (category_id) REFERENCES internal_stock_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO internal_stock_categories(concession_id,code,name,is_active)
SELECT DISTINCT a.concession_id,
       CONCAT('LEGACY_',LEFT(SHA2(UPPER(TRIM(i.category)),256),24)),
       UPPER(TRIM(i.category)),
       TRUE
FROM internal_stock_items i
JOIN agencies a ON a.id=i.agency_id
WHERE i.category IS NOT NULL AND TRIM(i.category)<>'';

UPDATE internal_stock_items i
JOIN agencies a ON a.id=i.agency_id
JOIN internal_stock_categories c
  ON c.concession_id=a.concession_id
 AND c.code=CONCAT('LEGACY_',LEFT(SHA2(UPPER(TRIM(i.category)),256),24))
SET i.category_id=c.id
WHERE i.category_id IS NULL AND i.category IS NOT NULL AND TRIM(i.category)<>'';
