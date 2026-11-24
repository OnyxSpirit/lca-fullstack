# Tests d'intégration MySQL et HTTP

## Environnement

- image : MySQL 8.4 ;
- projet : `lca-rbac-roles-01` ;
- base : `lca_rbac_roles_isolated` ;
- réseau interne : `lca-rbac-roles-01_private` ;
- volume : `lca-rbac-roles-01_mysql_data` ;
- migrations : niveau 133, aucun avertissement historique.

## Couverture réelle

Création, désactivation, persistance SQL, relecture liste/détail, appel répété, réactivation, session antérieure, changement d'agence, refus sans permission, protection système, conservation des permissions/affectations, refus d'affectation inactive, scopes et audits.

Résultats :

- intégration MySQL/HTTP : **1/1 réussi** ;
- contrat API : **2/2 réussis** ;
- ciblés RBAC/sessions/cachets : **24/24 réussis**, 19,344 s.

Deux premiers runners conservés documentent les itérations de test : le premier a détecté un mauvais nom de colonne dans le test, le second a révélé l'absence d'agence dans l'audit. Le troisième est concluant.
