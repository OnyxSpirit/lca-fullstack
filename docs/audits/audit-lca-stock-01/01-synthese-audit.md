# AUDIT-LCA-STOCK-01 — Synthèse

Audit effectué le 28 novembre 2026 sur le code courant, sans correction.

La section « Modèles sur commande » n'est pas un simple catalogue : elle réunit un catalogue mondial de profils techniques, un formulaire de création/modification de profil, une galerie, la création de commandes quantitatives et un tableau agence de suivi/réception. Elle est intégrée à `/vehicles` sous forme d'un onglet local, visible avec `vehicles.catalog.view`; l'ancienne route `/vehicles/catalog` redirige vers `/vehicles` sans sélectionner l'onglet.

Une commande crée immédiatement une ligne `vehicle_orders` et N lignes `vehicles` sans VIN, statut `ordered`, liées par `vehicle_order_id`. Une réception ne crée aucune fiche : elle verrouille la commande et les fiches encore `ordered`, fait passer les N premières (ordre `id`) à `received`, fixe `entry_date`, écrit historique, reçu et audit. Les identifiants restent inchangés.

Constats principaux : historique des réceptions persisté mais non affiché; aucun détail/lien des véhicules associés dans l'onglet; aucune recherche/filtre des commandes; aucune date fournisseur/prévisionnelle/prix de commande; le statut de commande est calculé à partir des statuts individuels non `ordered`, donc une modification manuelle (p. ex. `demo`) influe sur le compteur « Réceptionnés »; les profils sont globaux/centraux alors que commandes et réceptions sont agence; l'accès frontend exige `vehicles.catalog.view` même si le backend autorise la lecture avec `vehicles.catalog.manage` seul.

Niveaux de preuve : code, migrations et tests existants examinés; preuves MySQL/HTTP antérieures relues dans QUALIFICATION-LCA-02; navigateur atteint mais bloqué à l'authentification, donc aucune capture fonctionnelle authentifiée ni nouvelle écriture de scénario.

