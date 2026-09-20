# Futures migrations

Ce dossier contient exclusivement les évolutions postérieures au baseline.
La migration `034_role_deletion_permission.sql` ajoute `roles.delete`. La prochaine migration doit être nommée `035_description.sql`, puis la
numérotation continue sans doublon. Les migrations 001–033 de
`../legacy-migrations/` ne sont jamais parcourues par le runner.
