# Non-régression finale

## Worker comptable MySQL 8.4 — 13 novembre 2026

- Correction ciblée des quatre jointures `treasury_movements.source_id`, sans migration globale de collation.
- Filtre des avoirs clients corrigé : `issue_date` remplace la colonne inexistante `created_at`.
- Test `accounting-integration-collation.test.ts` réussi et backend reconstruit sans erreur TypeScript.
- Rejeu réel sur `lca_recette` : `{ "discovered": 0, "processed": 0 }`, sans erreur SQL.

- Build backend : réussi.
- Build frontend : réussi, 2546 modules transformés.
- Lint TypeScript frontend : réussi.
- Suite frontend complète : 219 fichiers réussis, 0 échec.
- Suite backend complète : 2 185 tests, 2 084 réussis, 0 échec, 101 ignorés conditionnels.
- Tests MySQL documentaires : DOC-022 + 21 variantes PDF réussis; 6 XLSX et 21 CSV réussis; 12 archives GED réussies.
- RBAC HTTP : anonyme 401, ressource hors agence 404, GET sans mutation GED.
- FIN-004 MySQL : événement unique, écriture équilibrée, rejeu idempotent, seconde découverte nulle.
- `git diff --check` : réussi; matrice finale : 67 conformes, 2 NA, 0 partiel.
- VIN : code existant non modifié.
- Livraison : code existant non modifié; suites logo/pied documentaire réussies.
- Comptabilité : renderer LCA ciblé réussi.

Les tests d’intégration conditionnels ignorés par la suite standard ont été complétés, pour le périmètre de cette mission, par les quatre campagnes explicites sur `lca_recette` décrites ci-dessus.

Aucun commit, push ou déploiement n’a été effectué.
