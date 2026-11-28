# RBAC et multi-agences

Lecture : `vehicles.catalog.view` ou `vehicles.catalog.manage`. Écriture et réception : `vehicles.catalog.manage`. Toutes les commandes et réceptions sont bornées par l'agence active ; une commande étrangère est absente des listes et renvoie 404 à la réception. Les scopes restent exclusivement `OWN` et `AGENCY`.
