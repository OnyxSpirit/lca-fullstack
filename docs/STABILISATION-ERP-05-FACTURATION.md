# STABILISATION-ERP-05 — Facturation

La recette a initialement rencontré la précondition « intégration Trésorerie non activée ». Le compte de caisse `REC05_CASH`, son mapping Espèces/agence 2 et la readiness concession ont été créés via les API officielles, avec audit ; aucun SQL métier direct.

| Vente | Facture | Total XAF | Encaissé | Solde | État |
|---|---|---:|---:|---:|---|
| #2 | FAC-REC01A2-2026-000001 | 16 943 250 | 3 388 650 | 13 554 600 | partially_paid |
| #5 | FAC-REC01A2-2026-000002 | 45 776 500 | 45 776 500 | 0 | paid |

Les lignes reprennent le véhicule, la quantité 1, le prix HT et la TVA snapshot 18,9 %. Les mouvements Treasury ont été produits automatiquement. Le passage en préparation est bloqué sans facture et avec solde, puis autorisé par paiement total ou dérogation financière.
