-- Rattachement explicite des comptes de trésorerie.
-- Les comptes historiquement rattachés à une agence sont non ambigus.
-- Les lignes historiques sans agence restent volontairement non classifiées :
-- elles doivent être qualifiées par un utilisateur autorisé, jamais déduites.
ALTER TABLE treasury_accounts
  ADD COLUMN attachment_type ENUM('AGENCY','CONCESSION') NULL AFTER agency_id,
  ADD KEY idx_treasury_account_attachment (concession_id,attachment_type,agency_id,is_active);

UPDATE treasury_accounts
SET attachment_type='AGENCY'
WHERE agency_id IS NOT NULL;

ALTER TABLE treasury_accounts
  ADD CONSTRAINT chk_treasury_account_attachment CHECK (
    (attachment_type='AGENCY' AND agency_id IS NOT NULL)
    OR (attachment_type='CONCESSION' AND agency_id IS NULL)
    OR attachment_type IS NULL
  );
