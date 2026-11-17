# 03 — Rapport migrations MySQL

Base jetable créée après contrôle d’absence : `lca_admin_isolated_test`, distincte de `lca_recette`.

Migrations appliquées jusqu’au niveau 132, sans étape incomplète. Le champ `role_permissions.scope` est `ENUM('OWN','AGENCY') NOT NULL`. La migration 131 conserve l’historique des 377 attributions examinées dans `rbac_scope_migration_history`. Trois valeurs invalides créées par l’ancien bootstrap permissif ont été détectées ; la cause a été corrigée et la migration 132 les a retirées sans attribuer de droit.

Restauration : sauvegarder `role_permissions` et `rbac_scope_migration_history` avant déploiement. En retour arrière applicatif, restaurer la sauvegarde ; ne pas reconstituer automatiquement les portées ambiguës.
