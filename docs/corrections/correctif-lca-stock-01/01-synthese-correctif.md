# Synthèse du correctif LCA-STOCK-01

La saisie d'une commande en flotte est réduite à la marque, au modèle, à une version facultative, à la quantité et à une illustration facultative. Chaque unité commandée crée immédiatement une fiche véhicule. La réception est désormais déterminée exclusivement par les écritures de `vehicle_order_receipts`, indépendamment des changements ultérieurs de statut individuel.

État au 28 novembre 2026 : périmètre fonctionnel implémenté et tests ciblés concluants. Verdict global : **VALIDÉ AVEC RÉSERVES DOCUMENTÉES**, la recette navigateur réelle et la non-régression globale complète restant à achever.
