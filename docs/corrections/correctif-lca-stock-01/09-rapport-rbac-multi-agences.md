# RBAC et multi-agences

Lecture : `vehicles.catalog.view` ou `vehicles.catalog.manage`. Création de commande, création transactionnelle de références dans ce parcours et réception : `vehicles.catalog.manage`. Ce droit spécialisé ne confère pas les droits généraux de paramétrage central. Le frontend masque les actions sans ce droit et le backend l'impose. Toutes les opérations sont bornées par l'agence active ; les scopes restent exclusivement `OWN` et `AGENCY`.

Clôture : trois contextes Chromium indépendants prouvent lecture/gestion/refus ; un utilisateur Alpha+Bêta prouve la bascule officielle sans fuite croisée.
