# ERP-17 — Matrice d'exécution

Préconditions communes : dépôt b102417, lca-recette4176/3004/33321, REC16 conservé. Tests simulés locaux isolés, hors volumes.

| ID | Objectif/actions | Attendu | Obtenu/preuves | Nature | Verdict |
|---|---|---|---|---|---|
| INIT | Git/Docker/DB/REC16 | environnement isolé intact | état initial documenté | CLI/SQL/API | VALIDÉ |
| BILL01 | comparer compte A1/A2/A3, recherche/type/pages | filtre agence cohérent | 0/12/11 ; 7+5 ; REC15=2 | API/SQL/code | VALIDÉ |
| BILL02 | filtres/détail/refresh navigateur | concordance UI | A1=0, A2=12, Atelier=4, détail facture9 cohérent hors ligne TTC déployée | navigateur | VALIDÉ |
| RBAC01 | profils métier navigateur | menus/actions/scopes | Super Admin contrôlé ; profils secondaires sans session disponible | navigateur | PARTIEL |
| RBAC02 | actions estimées Pièces | permissions dédiées | gardes ajoutées, tests verts ; post-déploiement non exécuté | code/tests/navigateur | PARTIEL |
| GAR01 | contexte Nouvel OR | champs contractuels complets | détail OR7 validé ; formulaire corrigé post-déploiement non exécuté | code/tests/navigateur | PARTIEL |
| TEST01 | suites avant/après | échecs qualifiés | backend67+2 skips ; frontend62 verts | automatisé | VALIDÉ |
| PDF01 | plafond et lignes facture | lisibilité/TTC | simulation3 pages contrôlées | test/visuel | VALIDÉ |
| GED01 | échec avant/pendant archive puis rejeu | nettoyage/reprise unique | simulation1/1 | automatisé simulé | VALIDÉ |
| GED02 | panne route complète/crash | intégrité de bout en bout | non injecté, limites identifiées | statique | PARTIEL |
| MC01 | audit conception | modèle/scopes/risques | rapport produit, une concession | statique | PARTIEL |
| BUILD | compiler backend/frontend | réussite | deux builds verts, Phase 2 reconfirmée | compilation | VALIDÉ |

VALIDÉ pour GED01/PDF01 concerne les simulations décrites, pas les ressources historiques ni une recette après déploiement.
