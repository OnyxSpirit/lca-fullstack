# STABILISATION-ERP-06 — Livraison

## Verdict

Le parcours Livraison est validé de bout en bout dans `lca-recette` : planification, affectation, report, préparation, checklist figée, documents, contrôle financier, signature, PV, mise à jour Vente/Stock, notifications et audit.

Deux livraisons ont été finalisées : `LIV-20261011-505659` (vente #2, livraison #2) et `LIV-20261011-495425` (vente #5, livraison #1). La vente annulée #4 n'a aucune livraison.

## Environnement

- Frontend : `127.0.0.1:4176`
- API : `127.0.0.1:3004`
- MySQL : `127.0.0.1:33321`
- Base : `lca_recette`, migrations appliquées 071 à 079
- Conteneurs historiques et port 3001 laissés intacts

## Résultat métier

- Vente #2 : livrée avec solde de 13 554 600 XAF, autorisation #1 passée de `AUTHORIZED` à `USED`, facture toujours `partially_paid`.
- Vente #5 : livrée après paiement intégral, facture `paid`, solde nul.
- Vente #4 : reste `cancelled`, véhicule #4 `available`, zéro livraison.
- Véhicules #3 et #7 : statut `delivered`, kilométrages 42 126 et 89 501.

Le compte de support `recette.livraison.nord@lca-test.cg` a été créé par l'API officielle dans l'agence 2 avec le rôle `RESPONSABLE_LIVRAISON`.
