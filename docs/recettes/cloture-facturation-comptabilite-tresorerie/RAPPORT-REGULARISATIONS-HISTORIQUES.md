# Régularisations historiques

## FIN-002

La commande `recover-historical-payment --payment-id=<id>` simule par défaut. `--apply` exige une configuration cohérente, verrouille les lignes, crée le mouvement et l’événement dans une transaction et inscrit un audit. Le rejeu retourne `ALREADY_RECOVERED` sans doublon.

Fixture : paiement 1, 100 000 XAF. Simulation `RECOVERABLE`, application mouvement 6, premier traitement `REGULARIZE`, correction de configuration, retry `POSTED`, écriture `VE-FIN-2025-000001` équilibrée.

Les paiements et remboursements historiques réels restent en lecture seule sans décision explicite de reprise.

La clôture finale n’a appliqué aucune régularisation sur une donnée réelle. Seule la base isolée `lca_financial_e2e` a été reconstruite et alimentée.

## FIN-006

La commande `diagnose-historical-refund --refund-id=<id>` ou `--payment-id=<id>` est strictement en lecture seule. L’inspection du conteneur `lca-recette-mysql-1` a établi que le paiement 9001, la facture 9002, l’avoir 9001 et le remboursement 9001 de 118 000 XAF sont des insertions directes de `backend-node/test/official-document-mysql-fixture.sql`. Elles contournent volontairement les API, la trésorerie, les écritures et les audits pour tester les documents officiels. Décision finale : ne pas fabriquer de régularisation financière rétroactive ; conserver ou supprimer ces données uniquement via une remise à zéro explicite de fixture.
