SELECT 'email' AS migration_conflict_type,COUNT(*) AS migration_conflict_groups
FROM (
    SELECT agency_id,LOWER(TRIM(email)) COLLATE utf8mb4_0900_as_ci AS normalized_value
    FROM customers
    WHERE NULLIF(TRIM(email),'') IS NOT NULL
    GROUP BY agency_id,normalized_value
    HAVING COUNT(*)>1
) email_conflicts
UNION ALL
SELECT 'téléphone' AS migration_conflict_type,COUNT(*) AS migration_conflict_groups
FROM (
    SELECT agency_id,REGEXP_REPLACE(phone,'[^0-9]','') AS normalized_value
    FROM customers
    WHERE NULLIF(REGEXP_REPLACE(COALESCE(phone,''),'[^0-9]',''),'') IS NOT NULL
    GROUP BY agency_id,normalized_value
    HAVING COUNT(*)>1
) phone_conflicts;

ALTER TABLE customers
    ADD COLUMN normalized_email VARCHAR(190)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci
        GENERATED ALWAYS AS (NULLIF(LOWER(TRIM(email)),'')) STORED,
    ADD COLUMN normalized_phone VARCHAR(50)
        CHARACTER SET ascii COLLATE ascii_bin
        GENERATED ALWAYS AS (NULLIF(REGEXP_REPLACE(phone,'[^0-9]',''),'')) STORED,
    ADD UNIQUE KEY uq_customer_agency_normalized_email (agency_id,normalized_email),
    ADD UNIQUE KEY uq_customer_agency_normalized_phone (agency_id,normalized_phone);
