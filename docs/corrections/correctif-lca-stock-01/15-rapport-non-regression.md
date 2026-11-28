# Non-régression

- Backend : build et lint réussis.
- Frontend : lint et build Vite de production réussis dans `/tmp/lca-stock-frontend-build-final`.
- Tests ciblés STOCK-01 : réussis.
- Test MySQL/HTTP EVOLUTION-LCA-01 adapté : réussi sur la recette isolée.
- Vérification d'immuabilité : réussie hors bac à sable.
- Suite backend globale : relancée ; les échecs observés concernent des prérequis DB/session/PDF déjà extérieurs au correctif. Le résultat final détaillé doit être conservé avant levée de réserve.

Le build dans `frontend/dist` n'a pas été utilisé à cause de droits préexistants ; le même build réussit vers un répertoire isolé.
