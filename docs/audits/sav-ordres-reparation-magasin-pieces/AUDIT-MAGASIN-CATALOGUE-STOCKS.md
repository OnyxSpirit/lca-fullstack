# Audit magasin — catalogue et stocks

- UI : `/parts`, `/parts/:id`.
- Catalogue : création/modification, catégories, référence/OEM, marque, prix, TVA, statut, recherche et onglets.
- Stocks : agence, emplacement, disponible/réservé, mouvements, inventaire, ajustement et transfert.
- Permissions spécialisées (`parts.catalog.*`, `parts.stock.*`, `parts.inventory.*`, `parts.reporting.view`).

Les tests couvrent zéro/négatif, quantité exacte, sur-réservation, double consommation, réception idempotente, transfert à deux mouvements et verrous `FOR UPDATE`. MySQL de recette : 1 pièce/stock/mouvement, aucun stock négatif ou surréservé.

Réserves : volumétrie insuffisante pour éprouver pagination/tri ; la compatibilité véhicule est moins structurée que les champs catalogue principaux.

Verdict : **CONFORME AVEC RÉSERVES**.

