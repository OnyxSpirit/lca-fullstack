-- B.3.4.2.1 : photographie privée des employés créés directement dans RH.
ALTER TABLE employee_profiles
  ADD COLUMN photo_path VARCHAR(255) NULL AFTER phone;

