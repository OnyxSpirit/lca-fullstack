# Non-régression globale

- TypeScript frontend : réussi.
- Build Vite : réussi, 2 551 modules.
- Tests frontend : 1 060/1 060 réussis, 0 échec, 0 ignoré (529,4 s).
- TypeScript backend : réussi.
- Tests RBAC ciblés : 3 fichiers réussis.
- Bootstrap MySQL 8.4 vierge : migration maximale 132, aucun scope invalide.
- Suite backend complète : 2 067 réussis, 0 échec, 104 gardés sur 2 171 tests déclarés (482,4 s).
- Matrice Showroom : 105/105 ; pagination Showroom : 12/12.
- Environnement Docker dédié : trois services sains, endpoint HTTP de santé réussi.
- Contrôle post-interruption : état Git attendu, `git diff --check` réussi, aucun conteneur historique supprimé ou remplacé.

Les 104 tests gardés de la commande standard ont été couverts par la campagne explicite MySQL/WSS antérieure. Les trois recettes MySQL RH/FIN concernées ont été rejouées : FIN-02, FIN-04 et RH-FIX-04, soit 3/3 réussies, aucun ignore.

Clôture du 19 novembre : backend 2 070/2 174 réussis, 0 échec, 104 gardés ; frontend 1 062/1 062 ; TypeScript backend/frontend et build Docker/Vite réussis. Fiscalité, FIN-02, FIN-04 et RH-FIX-04 ont été rejoués réellement sur le schéma frère MySQL 8.4 et réussissent 4/4 sans ignore. Les 104 gardes conservent leur campagne explicite antérieure documentée ; elles ne sont pas comptées comme réussites de la commande standard.
