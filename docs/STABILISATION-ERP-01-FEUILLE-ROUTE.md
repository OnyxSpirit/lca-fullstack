# STABILISATION-ERP-01 — Feuille de route des campagnes

| Campagne | Objectif / prérequis | Critère de sortie |
|---:|---|---|
| 01 | environnement frais, build puis bootstrap 079, santé, sauvegarde initiale | versions et checksums prouvés; aucun accès persistant |
| 02 | 16 profils, permissions/scopes, utilisateurs multi-agences | matrice positive/négative/inter-scope verte |
| 03 | CRM, rendez-vous, showroom, clients | prospect→client, conflits et timelines prouvés |
| 04 | référentiels et stock VN/VO/extérieur | statuts, images, transferts, coûts et scopes verts |
| 05 | devis et ventes | création, fiscalité, concurrence, annulation vertes |
| 06 | facturation, avoirs, paiements | intégrité montants/Treasury et documents verts |
| 07 | livraison intégrale et partielle, retours | garde, override, signatures, stock et retour verts |
| 08 | SAV, garanties et atelier | réception→restitution, planning/temps verts |
| 09 | pièces, fournisseurs et réservations | stock physique/réservé et réception concurrente verts |
| 10 | RH, contrats, congés, primes, rémunérations | séparation validation/paiement et scopes verts |
| 11 | budgets, dépenses, Treasury, rapprochement | budget ≠ cash, mouvements et rapprochements verts |
| 12 | paramètres, GED, identité, cachets et PDF | consommation réelle et immutabilité documentaire |
| 13 | notifications, activité, dashboards, reporting | auteur/scope/agrégats/exports cohérents |
| 14 | performance, endurance et concurrence | seuils documentés, aucune anomalie critique |
| 15 | parcours A–H et non-régression globale | 0 P0/P1, suites ciblées/globales qualifiées |

## Dépendances

01 précède tout. 02 précède chaque contrôle métier. 03–04 alimentent 05; 05 alimente 06–07; 03–04 et 09 alimentent 08; 10 précède le volet paie de 11; 12 doit être configurée avant toute preuve PDF définitive. Les campagnes 05–13 partagent la même base jetable pour conserver les liens. La concurrence 14 utilise un clone.

## Critères de préparation à une démonstration

- zéro anomalie P0/P1 ouverte sur parcours A–H;
- 100 % des scénarios critiques exécutés, preuves UI/API/MySQL conservées;
- RBAC multi-rôles et inter-concessions validé;
- stocks, finances, statuts et documents rapprochés;
- lint/build verts et échecs globaux qualifiés sans régression critique;
- p95 dans les seuils convenus, aucun 5xx/deadlock non géré;
- réserves métier acceptées explicitement.

Première campagne recommandée : **Campagne 01**, immédiatement suivie de la Campagne 02. Sans environnement frais et RBAC reproductible, les preuves des campagnes métier sont ambiguës.
