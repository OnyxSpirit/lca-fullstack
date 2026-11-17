-- Répare les valeurs ENUM invalides qu'un ancien bootstrap exécuté en mode SQL
-- permissif a pu stocker sous forme de chaîne vide, sans leur attribuer de droit.
DELETE FROM role_permissions
WHERE scope NOT IN ('OWN','AGENCY') OR scope IS NULL;

ALTER TABLE role_permissions
  ADD CONSTRAINT chk_role_permissions_two_scopes
  CHECK (scope IN ('OWN','AGENCY'));
