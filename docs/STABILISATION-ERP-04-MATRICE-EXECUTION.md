# STABILISATION-ERP-04 — Matrice d'exécution

| ID | Scénario | Résultat | Statut |
|---|---|---|---|
| ENV-01 | services/ports | 3001 préservé, recette saine | VALIDÉ |
| VEH-01 | création VN avec photo | 201, MySQL/UI | VALIDÉ |
| VEH-02 | création VO sans photo | 201 après correction | VALIDÉ |
| VEH-03 | 3 VN/3 VO multi-marques | persistés | VALIDÉ |
| VEH-04 | quatre agences | 1+ véhicule/agence | VALIDÉ |
| VEH-05 | édition couleur/km/prix | relue, historique prix | VALIDÉ |
| VEH-06 | fiche 360 | sections chargées | VALIDÉ |
| VIN-01 | VIN valide 17 | accepté | VALIDÉ |
| VIN-02 | vide/16/18/25 | 400 | VALIDÉ |
| VIN-03 | espaces/I/O/Q | 400 | VALIDÉ |
| VIN-04 | doublon séquentiel | 409 | VALIDÉ |
| VIN-05 | doublon concurrent | 201/409 | VALIDÉ |
| REF-01 | marques/modèles/versions | 6/7, cohérents | VALIDÉ |
| LOC-01 | référentiel dédié | `vehicle_locations` | VALIDÉ |
| LOC-02 | 4 Parc/4 agences | persistés et UI | VALIDÉ |
| IMG-01 | aucune photo | accepté | VALIDÉ |
| IMG-02 | une/deux photos | stockées | VALIDÉ |
| IMG-03 | affichage réel | miniature/détail visibles | VALIDÉ |
| IMG-04 | signature corrompue | 400 | VALIDÉ |
| GED-01 | dépôt PDF rattaché | 201, persistant | VALIDÉ |
| GED-02 | aperçu | 200 application/pdf | VALIDÉ |
| GED-03 | affichage fiche | visible, actions présentes | VALIDÉ |
| STAT-01 | received→preparation | 200/historique | VALIDÉ |
| STAT-02 | available | Parc actif obligatoire | VALIDÉ |
| STAT-03 | forcer sold | 409 | VALIDÉ |
| FILT-01 | recherche REC04 | 7 résultats | VALIDÉ |
| FILT-02 | marques/modèles/types | options cohérentes | VALIDÉ |
| FILT-03 | compteurs | 5 disponibles, 7 Parc | VALIDÉ |
| FILT-04 | vendus exclus actifs | 0 vendu | VALIDÉ |
| RBAC-01 | GLOBAL | administration complète | VALIDÉ |
| RBAC-02 | CONCESSION | 6 véhicules métier | VALIDÉ |
| RBAC-03 | AGENCY | 1 et hors agence 404 | VALIDÉ |
| RBAC-04 | OWN Commercial | 403/page indisponible | NON VALIDÉ |
| RBAC-05 | inter-concessions | indisponible | BLOQUÉ |
| CONC-01 | double VIN | intégrité préservée | VALIDÉ |
| CONC-02 | modifications simultanées | 200/200, champs conservés | VALIDÉ |
| PERF-01 | 85 appels | p95 159,89 ms, 0 5xx | VALIDÉ |
| TEST-01 | non-régression ciblée | 2/2 | VALIDÉ |
| SALE-01 | vendu/livré | réservé à ERP-05 | NON EXÉCUTÉ |
| IMG-05 | suppression concurrente | preuve conservée | NON EXÉCUTÉ |

Prévu 40 ; exécuté 38 ; validé 36 ; non validé 1 ; bloqué 1 ; non exécuté 2. Couverture exécutée 95 %, couverture validée stricte 90 %.

