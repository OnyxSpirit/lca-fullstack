-- Les libellés métier peuvent être identiques ; le code technique reste l'identifiant unique.
ALTER TABLE roles
  DROP INDEX name,
  ADD INDEX idx_roles_name (name);
