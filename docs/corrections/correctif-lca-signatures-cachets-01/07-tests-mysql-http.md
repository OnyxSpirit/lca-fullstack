# Tests MySQL et HTTP

## Environnement

- MySQL 8.4 dans le projet Docker isolé `lca-signatures-cachets-01` ;
- base `lca_codex_qualification`, volume et réseau dédiés ;
- migrations appliquées jusqu'au niveau 133 ;
- données uniquement fictives.

## Résultats

- B3.2.1 : **1 test réussi, 0 échec, 0 ignoré**, 12,845 s ; persistance, relecture, HTTP, audit, RBAC, seconde agence et non-collision politique/cachet.
- LOT13 : **7 sous-tests réussis** avant blocage du scénario historique de concurrence ; le nouveau refus du rôle non autorisé est réussi en 597 ms.

Réserve : LOT13 n'a pas produit son résumé final, car le huitième scénario attend indéfiniment le hook de verrouillage. Le processus a été interrompu après reproduction.
