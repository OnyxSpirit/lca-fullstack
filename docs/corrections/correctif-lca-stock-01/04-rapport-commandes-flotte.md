# Commandes en flotte

La création valide la cohérence marque/modèle/version, crée une commande et exactement N fiches rattachées avec numéro de stock. Le VIN et la version peuvent être complétés plus tard. Les anciennes commandes continuent d'être lues via le profil commercial historique ou les nouvelles colonnes directes.

L'idempotence repose sur `(created_by, client_request_id)` et renvoie la commande initiale lors d'un rejeu.
