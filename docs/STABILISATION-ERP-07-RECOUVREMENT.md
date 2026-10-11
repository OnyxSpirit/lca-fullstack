# ERP-07 — Recouvrement

## Vente #2 conservée

Le dossier prioritaire est resté inchangé : encaissé 3 388 650 XAF, solde 13 554 600 XAF, facture partiellement payée, vente/livraison/véhicule livrés, autorisation #1 toujours `USED`. La consultation frontend, API et MySQL est conforme.

## Scénarios destructifs déplacés

Le recouvrement partiel puis intégral a été exécuté sur la facture manuelle REC07 #6 afin de préserver la vente #2. Après paiement complémentaire, la facture est passée à `paid`, sans effet sur les ventes, livraisons ou stocks historiques.

La facture REC07 #4 est conservée partiellement payée (190 000 XAF encaissés, avoir 100 000 XAF, solde 899 000 XAF) comme dossier supplémentaire de recouvrement.
