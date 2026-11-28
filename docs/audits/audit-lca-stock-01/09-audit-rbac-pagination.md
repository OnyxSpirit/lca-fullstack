# RBAC, agences et pagination

`vehicles.catalog.view` et `vehicles.catalog.manage` sont créées par migration 103. Les opérations de profil utilisent une autorisation centrale (profil commun à la version). Les commandes utilisent l'autorisation métier de l'agence active et filtrent systématiquement `agency_id`.

Le projet impose désormais OWN/AGENCY, mais le catalogue conserve une sémantique centrale héritée. Pour les commandes, le scope effectif est l'agence active; une commande étrangère est absente de la liste et sa réception renvoie 404. Le changement d'agence modifie la clé de requête globale via le contexte/session de l'API; la page ne met pas `agencyId` dans la query key des commandes, mais le mécanisme global de changement d'agence doit invalider les requêtes. Ce point n'a pas été observé en navigateur.

Écarts frontend/backend : l'onglet est affiché uniquement avec `catalog.view`, alors que `GET /commercial-models` accepte view OU manage; un utilisateur manage sans view ne peut donc pas entrer dans l'onglet. Inversement, `useVehicleReferencesQuery` appelle `/vehicle-references`, qui exige `vehicles.view` ou `vehicles.create`; un gestionnaire de catalogue dépourvu de ces droits voit la page mais pas les versions nécessaires à la création.

Pagination commandes : serveur réelle, pageSize autorisées 10/20/50/100, count limité à l'agence avant `LIMIT/OFFSET`, tri stable `ordered_at DESC,id DESC`, page bornée. L'UI envoie uniquement page/pageSize et affiche intervalle/total/navigation. Aucun filtre, recherche ou tri utilisateur n'est appliqué. Le catalogue des profils est chargé entièrement puis recherché localement.

