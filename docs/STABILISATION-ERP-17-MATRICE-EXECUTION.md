# ERP-17 — Matrice d'exécution

Préconditions communes : corrections ERP-17 à `4fa8cdf`, lca-recette4176/3004/33321, REC15/REC16 conservés. Tests simulés locaux isolés, hors volumes.

| ID | Objectif/actions | Attendu | Obtenu/preuves | Nature | Verdict |
|---|---|---|---|---|---|
| INIT | Git/Docker/DB/REC16 | environnement isolé intact | état initial documenté | CLI/SQL/API | VALIDÉ |
| BILL01 | comparer compte A1/A2/A3, recherche/type/pages | filtre agence cohérent | 0/12/11 ; 7+5 ; REC15=2 | API/SQL/code | VALIDÉ |
| BILL02 | filtres/détail/refresh navigateur | concordance UI | A1=0, A2=12, Atelier=4, détail facture9 cohérent hors ligne TTC déployée | navigateur | VALIDÉ |
| RBAC01 | profils métier navigateur | menus/actions/scopes | Super Admin contrôlé ; profils secondaires sans session disponible | navigateur | PARTIEL |
| RBAC02 | actions estimées Pièces | permissions dédiées | code déployé, PARTS-FE-09 vert ; profils opposés navigateur indisponibles | code/tests/navigateur | PARTIEL |
| GAR01 | contexte Nouvel OR | champs contractuels complets | formulaire et détail OR7 validés post-déploiement | navigateur | VALIDÉ |
| TEST01 | suites après déploiement | non-régression ciblée | backend69+2 skips ; frontend62/62 | automatisé | VALIDÉ |
| PDF01 | plafond et lignes facture | lisibilité/TTC | renderer déployé inspecté : TTC23780, plafond100000, pagination A4 | test/visuel | VALIDÉ |
| GED01 | échec avant/pendant archive puis rejeu | nettoyage/reprise unique | simulation1/1 | automatisé simulé | VALIDÉ |
| GED02 | panne route complète/crash | intégrité de bout en bout | non injecté, limites identifiées | statique | PARTIEL |
| MC01 | audit conception | modèle/scopes/risques | rapport produit, une concession | statique | PARTIEL |
| BUILD | compiler backend/frontend | réussite | builds locaux et images Docker ciblées réussis | compilation/Docker | VALIDÉ |
| DOCKER | remplacer seulement backend/frontend recette | MySQL/historique/volumes inchangés | seuls deux IDs autorisés changés ; six services healthy | Docker/SQL/HTTP | VALIDÉ |

PDF01 est validé sur le renderer réellement déployé sans réécrire l'archive historique. GED01 reste une injection isolée, pas une panne processus complète.
