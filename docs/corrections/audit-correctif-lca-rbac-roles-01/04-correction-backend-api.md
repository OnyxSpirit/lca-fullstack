# Correction backend et API

## Contrat canonique

`roleContract()` convertit systématiquement :

- `id` en chaîne ;
- `is_system` et `is_active` en booléens ;
- `user_count` en nombre.

Ce contrat est appliqué à la liste et au détail, donc également aux réponses de création, modification, désactivation et réactivation.

## Transition de statut

La route reste `PATCH /roles/:id/status`, protégée par `roles.disable` et l'autorisation centrale actuelle. Le service verrouille le rôle, refuse les rôles système, écrit la valeur, la relit dans la même transaction et lève une erreur si la persistance ne correspond pas.

Les appels répétés sont idempotents et journalisés avec un indicateur `changed`. Les utilisateurs associés reçoivent l'événement temps réel `rbac:updated`.

Les rôles système, dont `SUPER_ADMIN`, restent impossibles à désactiver par cette route.
