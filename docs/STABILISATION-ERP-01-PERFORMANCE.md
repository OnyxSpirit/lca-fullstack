# STABILISATION-ERP-01 — Stratégie performance et stabilité

Aucune valeur ci-dessous n’est annoncée comme mesurée. Ce sont des seuils de recette locale isolée, à réviser selon matériel et latence.

| Couche/opération | Mesure | Seuil de référence p95 |
|---|---|---:|
| Frontend route lazy | navigation prête hors premier chargement | < 1,5 s |
| Dashboard/reports | contenu utile | < 2,5 s |
| Tableau paginé/recherche | réponse visible, 50 lignes | < 1,5 s |
| API lecture simple | serveur hors réseau | < 300 ms |
| API agrégée | dashboard/reporting/360 | < 1 200 ms |
| Mutation transactionnelle | vente, paiement, réception | < 1 500 ms |
| PDF | génération/lecture archive | < 5 s |
| Upload 10 Mo max autorisé | traitement complet | < 10 s |
| SQL | requête individuelle hors export | < 250 ms; aucune > 1 s sans justification |
| Socket.IO | événement → invalidation UI | < 2 s |
| Concurrence | conflit métier | pas de 500; gagnant unique; < 5 s |

## Protocole

- Fixer versions, CPU/RAM, taille DB, navigateur, cache froid/chaud et latence.
- Collecter Performance API/DevTools, temps API, `EXPLAIN ANALYZE`, slow query log jetable, pool, RSS/heap et logs 5xx.
- Jeux : 10k clients/prospects, 10k véhicules historiques, 50k mouvements, 100k activités/notifications, 20k documents métadonnées.
- Exécuter 30 itérations après échauffement; rapporter médiane, p95, p99, erreurs et débit.
- Navigation prolongée 2 h avec reconnexions Socket.IO, refresh token, changements d’agence et 500 mutations mixtes.
- Concurrence : 10–50 clients sur véhicule, pièce, paiement, décaissement, rapprochement et réception fournisseur.

## Opérations prioritaires

Recherche globale, fiches 360 client/véhicule, listes paginées, dashboard, rapports consolidés/financiers, export CSV, génération PDF, création vente, paiement, livraison, planning atelier, consommation pièce, journal Treasury et activité.

## Critères d’arrêt

Toute corruption, doublon, fuite de scope, 5xx reproductible, deadlock non récupéré, perte Socket.IO durable, croissance mémoire non stabilisée ou requête > 5 s hors export est bloquante pour la démonstration.
