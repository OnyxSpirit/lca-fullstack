# Non-régression finale

## Worker comptable MySQL 8.4 — 13 novembre 2026

- Correction ciblée des quatre jointures `treasury_movements.source_id`, sans migration globale de collation.
- Filtre des avoirs clients corrigé : `issue_date` remplace la colonne inexistante `created_at`.
- Test `accounting-integration-collation.test.ts` réussi et backend reconstruit sans erreur TypeScript.
- Rejeu réel sur `lca_recette` : `{ "discovered": 0, "processed": 0 }`, sans erreur SQL.

- Build backend : réussi.
- Build frontend : réussi, 2546 modules transformés.
- Lint TypeScript frontend : réussi.
- `git diff --check` : réussi.
- Tests documentaires ciblés : 4 fichiers, 4 réussis.
- Tests MySQL documentaires : 21/21 rendus réussis.
- VIN : code existant non modifié.
- Livraison : code existant non modifié; suites logo/pied documentaire réussies.
- Comptabilité : renderer LCA ciblé réussi.

Aucun commit, push ou déploiement n’a été effectué.
