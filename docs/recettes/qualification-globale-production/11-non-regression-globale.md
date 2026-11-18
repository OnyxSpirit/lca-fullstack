# Non-régression globale

- TypeScript frontend : réussi.
- Build Vite : réussi, 2 551 modules.
- Tests frontend : 44 réussis.
- TypeScript backend : réussi.
- Tests RBAC ciblés : 3 fichiers réussis.
- Bootstrap MySQL 8.4 vierge : migration maximale 132, aucun scope invalide.
- Suite backend complète : 2 067 réussis, 0 échec, 104 ignorés sur 2 171 tests déclarés (269,4 s).
- Matrice Showroom : 105/105 ; pagination Showroom : 12/12.
- Environnement Docker dédié : trois services sains, endpoint HTTP de santé réussi.
- Contrôle post-interruption : état Git attendu, `git diff --check` réussi, aucun conteneur historique supprimé ou remplacé.

Réserve : les 104 tests gardés/ignorés ne constituent pas une preuve d'exécution MySQL/WSS. Ils restent dans le périmètre de la recette autoritative isolée.
