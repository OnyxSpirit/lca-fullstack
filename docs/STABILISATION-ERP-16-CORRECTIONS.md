# ERP-16 — Corrections du bloc concurrence/idempotence

Aucune correction du produit n'a été nécessaire.

Corrections limitées aux scripts de recette :

1. lecture de `items` sur la réponse paginée `/parts` ;
2. relecture détaillée d'une facture après sa création avant de décider son émission ;
3. rejeu officiel de `PATCH /invoices/:id/status` pour garantir l'archive avant paiement ;
4. ajout des étapes Atelier obligatoires affectation, session start/stop, puis intervention `completed` ;
5. assertion d'encaissement corrigée pour conserver le solde légitime de 18 900 XAF après le paiement gagnant de 100 000 XAF.

Ces ajustements ne modifient aucune règle métier, migration ou donnée historique.

