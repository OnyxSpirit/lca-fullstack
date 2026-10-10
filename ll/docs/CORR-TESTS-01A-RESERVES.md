# CORR-TESTS-01A — Réserves

| ID | Réserve | Priorité | Statut | Levée attendue |
|---|---|---:|---|---|
| CTA-R01 | 105 échecs backend persistent après authentification | P1 | OUVERTE | CORR-TESTS-01B, analyse sans élargir RBAC |
| CTA-R02 | 39 échecs frontend, dont un scénario DEL-CAND intermittent réapparu | P1 | OUVERTE | Reproduire isolé/fichier/globale et corriger la cause réelle |
| CTA-R03 | `mock.module` reste une API expérimentale Node | P2 | OUVERTE | Stabiliser la politique de version/runner CI |
| CTA-R04 | Helper persistant non validé sur MySQL 8.4 dans ce lot | P2 | OUVERTE | Ajouter une intégration jetable avec vraie ligne `refresh_tokens` |
| CTA-R05 | Plusieurs tests historiques attendent désormais un statut métier différent après passage du RBAC | P1 | OUVERTE | Comparer chaque attente à la règle actuelle dans 01B |
| CTA-R06 | Assertions structurelles/migrations hors périmètre | P2 | OUVERTE | Traiter selon le plan DIAG-TESTS-01 |

