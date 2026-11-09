-- Intégration additive de la caisse de transit SAV avec les moyens de paiement
-- et les comptes Treasury. Les colonnes restent nullables pour préserver les
-- transferts historiques créés avant cette intégration.
ALTER TABLE sav_transit_transfers
  ADD COLUMN payment_method_id BIGINT UNSIGNED NULL AFTER agency_id,
  ADD COLUMN destination_account_id BIGINT UNSIGNED NULL AFTER payment_method_id,
  ADD COLUMN operation_kind ENUM('PHYSICAL_TRANSFER','ACCOUNTING_RECONCILIATION') NULL AFTER destination_account_id,
  ADD KEY idx_sav_transit_method(agency_id,payment_method_id,status),
  ADD CONSTRAINT fk_sav_transit_method FOREIGN KEY(payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_sav_transit_destination FOREIGN KEY(destination_account_id) REFERENCES treasury_accounts(id) ON DELETE RESTRICT;
