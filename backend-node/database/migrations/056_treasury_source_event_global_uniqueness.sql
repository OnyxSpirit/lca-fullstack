SELECT 'TREASURY_SOURCE_EVENT_DUPLICATE' AS migration_conflict_type,COUNT(*) AS migration_conflict_groups
FROM (
  SELECT source_type,source_id,event_type
  FROM treasury_movements
  GROUP BY source_type,source_id,event_type
  HAVING COUNT(*)>1
) conflicts;

ALTER TABLE treasury_movements
  DROP INDEX uq_treasury_source_event,
  ADD UNIQUE KEY uq_treasury_source_event (source_type,source_id,event_type);
