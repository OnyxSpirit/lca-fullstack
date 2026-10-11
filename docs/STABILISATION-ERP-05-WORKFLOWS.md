# STABILISATION-ERP-05 — Workflows

## Vente

`reserved → ordered → confirmed → preparation → ready_for_delivery → delivered`.

La création produit directement `reserved`. `delivered` ne peut être posé que par Livraison. `cancelled` est terminal ; il est autorisé depuis les états antérieurs à la mise en livraison, avec motif, sans paiement et sans livraison active.

## Stock et finance

- création : `available → reserved` et réservation `confirmed` ;
- commande : réservation `converted` ;
- confirmation : véhicule `reserved → sold` et coûts historisés ;
- préparation : facture active émise et soldée, ou autorisation financière couvrant le solde ;
- annulation : véhicule `reserved|sold → available`, réservation `cancelled` ;
- facture : `draft → issued → partially_paid → paid` ;
- livraison : workflow dédié, non exécuté dans ce lot.

Transitions interdites observées : préparation sans facture 409, préparation avec paiement partiel sans autorisation 409, sortie d'une vente annulée 409, facture après annulation 409.
