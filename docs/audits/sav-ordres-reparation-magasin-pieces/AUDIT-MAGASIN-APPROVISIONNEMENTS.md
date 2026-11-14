# Audit magasin — approvisionnements

Commandes fournisseur, lignes, réception partielle, reliquat, emplacement, entrées de stock et PDF de réception existent. La réception est idempotente et seule elle augmente le stock. Les achats directs disposent de permissions dédiées.

Les pièces destinées à un OR sont rapprochées via la demande interne et ses lignes ; les quantités demandées, préparées, livrées, reçues, consommées et retournées sont bornées.

La recette contient une commande et une demande interne, sans volume suffisant pour un parcours complet approvisionnement → reliquat → livraison finale.

Verdict : **CONFORME AVEC RÉSERVES**.

