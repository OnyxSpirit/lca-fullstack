# Commandes en flotte

La création accepte les combinaisons existant/existant, existant/nouveau et nouveau/nouveau. Elle normalise les espaces, réutilise sans doublon les correspondances insensibles à la casse, refuse les références inactives et valide la cohérence marque/modèle/version. La création éventuelle des références, de la commande et des N fiches est atomique et protégée contre interblocages et courses d'unicité. Le VIN et la version restent facultatifs.

L'idempotence repose sur `(created_by, client_request_id)` et renvoie la commande initiale lors d'un rejeu. Le test MySQL final couvre aussi rollback, concurrence sur marque/modèle et réutilisation des références.
