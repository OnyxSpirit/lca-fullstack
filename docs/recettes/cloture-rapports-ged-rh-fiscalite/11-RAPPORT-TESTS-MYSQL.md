# Rapport des tests MySQL

MySQL 8.4/InnoDB a appliqué baseline + migrations 072 à 130, sans avertissement historique. Les quatre tables fiscales, clés étrangères, contrôles de dates/montants, index de scope et unicités sont présentes.

Le test `fin02-budget-approval-mysql.integration.test.ts` est vert et couvre transactions, permissions séparées, acteur polyvalent, historique et concurrence de consommation budgétaire. La somme engagée demeure bornée sous verrou.

## Campagne finale MySQL 8.4

| Suite | Scénarios | Résultat |
|---|---:|---|
| Reporting persistant | 5 | 5 réussis |
| GED HTTP + stockage + MySQL | 1 composite | réussi |
| RH Reporting et scopes sources | 1 composite | réussi |
| Fiscalité workflow/RBAC/concurrence | 1 composite | réussi |

Les tests utilisent `lca_reporting_ged_hr_e2e` sur le port isolé 33323. Le premier lancement de cette campagne utilisait une valeur locale de mot de passe non alignée sur le conteneur et a échoué avant scénario ; la relance avec la configuration exacte du conteneur, sans afficher le secret, est entièrement verte. Ce défaut d’infrastructure n’est pas compté comme anomalie applicative.
