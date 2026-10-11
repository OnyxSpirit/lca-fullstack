# STABILISATION-ERP-05 — Anomalies

| ID | Gravité | Constat | Décision |
|---|---|---|---|
| REC05-A01 | P2 | rejeu idempotent `POST /sales` renvoie 201 malgré la vente préexistante | ouverte ; intégrité préservée |
| REC05-A02 | P2 | vente livrée affiche « Régularisation financière requise » alors que l'annulation est terminalement impossible | ouverte ; UX à corriger avec le lot Livraison |
| REC05-A03 | P1 | motif d'annulation via dialogue natif `window.prompt` | réserve historique R2 conservée |
| REC05-A04 | P1 | suite frontend globale : 755/786, 31 échecs historiques dont `SALE-DISCOUNT` | R1 conservée, pas de correction opportuniste |
| REC05-A05 | P2 | test backend `concession-workflow-conformity` contient deux assertions périmées | R1 conservée ; comportement runtime validé |

Aucune anomalie d'intégrité REC05, erreur 5xx, double réservation, double facture ou corruption de montant n'a été observée. Aucun code métier n'a été modifié dans ce lot.
