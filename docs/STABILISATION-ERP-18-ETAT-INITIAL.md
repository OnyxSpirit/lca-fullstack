# ERP-18 — État initial

## Git

- branche `main`, HEAD `42540ceb2e7701d977ae671d78c4d784681b2544` ;
- `git status --short` vide et `git diff --check` sans erreur au démarrage ;
- différence avec la clôture ERP-17 : les rapports alors non suivis sont désormais présents dans HEAD. ERP-18 n'a effectué aucune opération d'historique Git.

## Docker

| Conteneur | ID initial | Santé | Port hôte |
|---|---|---|---|
| `lca-recette-frontend-1` | `e07f20611b41` | healthy | 4176 |
| `lca-recette-backend-1` | `6fb9d0de0f19` | healthy | 3004 |
| `lca-recette-mysql-1` | `5e7de0bab86f` | healthy | 33321 |
| `lca-frontend-1` | `323a78fc5f2b` | healthy | 3001 |
| `lca-backend-1` | `ce40bb9ad897` | healthy | aucun port hôte |
| `lca-mysql-1` | `9b37c86b3190` | healthy | aucun port hôte |

Les IDs correspondent à la fin ERP-17. Les ports, volumes et réseaux observés sont inchangés. La dérive connue du projet `lca-recette` demeure limitée au MySQL créé historiquement avec deux fichiers Compose ; aucune action n'a été entreprise.

## Sauvegardes

`backups/erp17-pre-update-20261011` est présent avec dump MySQL, archives GED/uploads, anciennes images, Compose, environnement et `SHA256SUMS`. Aucune restauration n'a été tentée.

## Données de référence

Au relevé final en lecture : 24 utilisateurs, 18 rôles, 1 concession, 4 agences, 46 documents, 12 véhicules, 11 ventes, 23 factures, 15 paiements, 8 OR et 11 stocks de pièces. Ventes 4 et 7 annulées ; 9 et 11 livrées ; 10 réservée.
