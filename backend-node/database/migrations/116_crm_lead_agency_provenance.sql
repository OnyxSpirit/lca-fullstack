ALTER TABLE leads
  ADD COLUMN agency_id BIGINT UNSIGNED NULL AFTER customer_id,
  ADD KEY idx_leads_agency_id (agency_id),
  ADD CONSTRAINT fk_leads_agency
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE leads l
LEFT JOIN users assignee ON assignee.id = l.assigned_user_id
LEFT JOIN users creator ON creator.id = l.created_by
SET l.agency_id = COALESCE(assignee.agency_id, creator.agency_id)
WHERE l.agency_id IS NULL;
