# Non-régression

- Backend Node 22 : lint et build réussis.
- Frontend Node 22 : lint et build Vite réussis dans `.artifacts/correctif-lca-stock-01-final`.
- Backend standard : 2 399 tests, 2 292 réussis, 0 échec, 107 ignorés conditionnels (`preuves/backend-standard-final2.tap`).
- Frontend complet : 1 103 tests, 1 103 réussis, 0 échec, 0 ignoré (`preuves/frontend-complet-final.tap`).
- Inventaire conditionnel : 107 déclarations dans 80 fichiers. Les 105 cas communs ont été réellement activés dans huit partitions MySQL ; le seul sous-test défaillant a révélé un chemin GED contenant `..`, le lanceur l'a canonicalisé et le fichier complet a réussi au rejeu. Le provisionnement administrateur a ensuite réussi sur base vierge dédiée et le WSS sur banc TLS dédié.
- Stock MySQL/HTTP final : réussi, incluant KPI exacts, références libres, doublons, concurrence, idempotence et rollback.

Le build dans `frontend/dist` n'a pas été écrasé à cause de droits préexistants ; l'interruption n'a donc endommagé aucun artefact existant.

Clôture : lint backend final, tests documentaires ciblés 3/3, test de clôture MySQL/HTTP vert et `git diff --check` propre.
