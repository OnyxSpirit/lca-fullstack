# Audit des causes racines

## Reproduction technique

Avant correction, `rolesList()` et `rolePermissions()` retournaient directement les lignes MySQL. Pour un rôle désactivé, la réponse contenait `is_active: 0`. Dans `RoleManagementPanel`, les badges, filtres et boutons utilisaient `role.is_active === false`. Or `0 === false` vaut `false` en JavaScript : badge Actif et bouton Désactiver restaient affichés.

La correction précédente de cache ne pouvait pas résoudre ce défaut : elle fusionnait la réponse `0` dans le cache, sans normalisation.

## Causes secondaires

- la mutation d'état n'affichait aucune notification et ne gérait pas ses erreurs ;
- son invalidation était déclenchée sans être attendue ;
- l'audit central des rôles ne conservait pas l'agence active ;
- le backend ne relisait pas explicitement la valeur persistée avant de répondre.

## Références

- `backend-node/src/modules/users/user.service.ts` : `roleContract`, `roleStatus`, audit des rôles ;
- `frontend/src/api/userHooks.ts` : mutation et invalidation ;
- `frontend/src/modules/users/RoleManagementPanel.tsx` : badge, bouton et gestion d'état locale.

La résolution des permissions était déjà correcte : les requêtes de `agency-rbac.service.ts` joignent uniquement les rôles `r.is_active=TRUE`, à chaque requête authentifiée.
