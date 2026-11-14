# Rapport des tests d’intégration

## Tests exécutés

- Campagne ciblée de 26 fichiers couvrant ventes, devis, pro forma, showroom, livraison, documents et RBAC.
- Premier passage : 20 fichiers réussis ; 6 en erreur d’infrastructure `EPERM` lors de l’ouverture d’un port éphémère.
- Rejeu hors bac à sable des 6 : 145 tests, 145 réussis, 0 échec.
- Les fichiers rejoués : candidats livraison, sécurité documents livraison, doublons showroom, endpoint OWN, pagination showroom, matrice de scopes showroom.
- Builds TypeScript frontend/backend et lint TypeScript : sans diagnostic observé.

## Suites MySQL 8.4 requises

| Suite | Objectif | État |
|---|---|---|
| `showroom-integrity-mysql.integration.test.ts` | doublons, conversion concurrente, rollback, scopes/FK | 3/4 réussis, 1 bloqué infra, 2 584,54 ms |
| `delivery-checklist-concurrency-mysql.integration.test.ts` | snapshot, sérialisation, finalisation concurrente | 9/9 réussis, 4 287,28 ms |
| `delivery-financial-authorization-concurrency-mysql.integration.test.ts` | autorisation/consommation/révocation | 8/8 réussis, 7 850,37 ms |
| `delivery-services-concurrency-mysql.integration.test.ts` | services et facturation concurrente | 6/6 réussis, 4 240,07 ms |
| `sale-cancellation-mysql.integration.test.ts` | double vente, annulation, paiement/facture concurrents | 1/1 top-level réussi, 17 670,96 ms |

Schéma utilisé : `lca_audit_commercial_b0bd7910`, structure et seules références techniques copiées depuis `lca_recette`. Le cas rollback showroom n’a pas été exécuté : MySQL avec journal binaire refuse le trigger injecté par le test sans privilège `SUPER` ou variable globale `log_bin_trust_function_creators`. La sécurité globale n’a pas été affaiblie.

## RBAC dynamique

La suite `agency-rbac-context-mysql.integration.test.ts` a été lancée dans `lca_audit_commercial_test_b0bd7910` au niveau migration 127. Elle s’arrête après 6 334,62 ms sur `401 TWO_FACTOR_AUTHENTICATION_REQUIRED` au lieu de 200 pour le superadministrateur système créé par la fixture. Ce résultat est **NON TESTÉ/INCOMPATIBLE FIXTURE** pour le changement d’agence complet, et non une régression RBAC établie. Les tests ciblés 401/403/404, scopes showroom, endpoint OWN et garde backend restent réussis.

Les deux schémas jetables ont été supprimés après collecte des preuves.
