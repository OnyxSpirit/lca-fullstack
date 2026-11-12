SELECT 'sales_opportunity_duplicate' AS migration_conflict_type,COUNT(*) AS migration_conflict_groups
FROM (
  SELECT opportunity_id
  FROM sales
  WHERE opportunity_id IS NOT NULL
  GROUP BY opportunity_id
  HAVING COUNT(*)>1
) conflicts;

ALTER TABLE sales
  ADD UNIQUE KEY uq_sales_opportunity_id (opportunity_id);
