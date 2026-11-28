# Commandes en flotte

Réponses factuelles :

1. Oui, plusieurs unités d'un modèle en une opération (1..1000).
2. Oui, « Quantité à commander » dans l'éditeur du modèle.
3. Oui, directement dans « Modèles sur commande ».
4. Oui, `quantity` est validée serveur.
5. Oui, dans `vehicle_orders.quantity_ordered`.
6. Oui, une ligne `vehicle_orders` et un numéro `CMD-xxxxxx`.
7. Oui, exactement N lignes `vehicles`, dans la même transaction.
8. Oui, elles entrent dans `/vehicles` car elles sont du stock commercial non archivé.
9. `ordered` / « Commandé » (l'onglet de commande affiche « En commande »).
10. FK `vehicles.vehicle_order_id`.
11. Non, VIN NULL accepté.
12. Non, aucun VIN fictif.
13. Version, agence, origine, type VN, prix catalogue/vente et créateur sont copiés; le profil technique reste résolu par version.
14. `ordered` les distingue des unités reçues; `entry_date` reste NULL.

Atomicité : commande, fiches, numéros stock, historiques et audit sont dans la transaction. Une erreur provoque le rollback. Le modèle doit être commercialisable et est verrouillé. La clé UUID empêche la double création par même utilisateur. Les valeurs zéro, négatives, décimales et >1000 sont rejetées 400.

