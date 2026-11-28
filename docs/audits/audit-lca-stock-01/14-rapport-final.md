# Rapport final consolidé — AUDIT-LCA-STOCK-01

La section contient à la fois le catalogue de profils et le workflow opérationnel de commande/réception. Elle est accessible sous `/vehicles` via l'onglet « Modèles sur commande », à condition de posséder `vehicles.catalog.view`. Elle affiche le suivi paginé des commandes de l'agence, la recherche locale des profils, l'éditeur technique, la commande quantitative, la galerie et la modale de réception.

Les boutons recensés sont : les deux onglets; Nouveau profil/modèle; sélection d'un modèle; Enregistrer; Enregistrer la commande; Réceptionner; Annuler; Confirmer la réception; Ajouter une photographie; monter; descendre; définir principale; supprimer; contrôles complets de pagination. Les formulaires et champs sont détaillés dans `03-audit-formulaires-actions.md`.

Le tableau unique de commandes comprend Référence, Modèle, Date, Commandés, Réceptionnés, Restants, État, Action. Les données viennent de `GET /vehicle-orders`; aucune recherche, filtre ou tri interactif n'est disponible. La pagination est serveur avec count agence, tri stable, LIMIT/OFFSET et tailles 10/20/50/100.

La commande en flotte est réellement accessible dans cette section : quantité 1..1000, POST `/vehicle-orders`, transaction créant une commande et N fiches individuelles sans VIN, statut `ordered`, liées par `vehicle_order_id`. Les mêmes identifiants sont conservés lors des réceptions. Une réception partielle choisit les premiers IDs encore `ordered`, les passe à `received`, date l'entrée, historise et écrit un reçu. La réception totale est la même opération sur tout le reliquat. Les verrous `FOR UPDATE`, uniques UUID et transaction protègent concurrence, double soumission et rollback.

Le reliquat affiché est `quantity_ordered - SUM(vehicle.status <> 'ordered')`, et non la somme de `vehicle_order_receipts`. C'est l'incohérence la plus importante : une modification individuelle de statut peut changer artificiellement le suivi de la commande. Les véhicules sont visibles dans « Véhicules en stock », mais ce dernier n'expose ni la commande d'origine ni un filtre/lien par commande. VIN et photos peuvent être complétés par les workflows individuels du stock.

Les permissions directes sont `vehicles.catalog.view` et `vehicles.catalog.manage`; les références de versions nécessitent en plus `vehicles.view` ou `vehicles.create`; les opérations individuelles utilisent `vehicles.view`, `vehicles.update`, `vehicles.status.update`, `vehicles.images.manage`. Le backend cloisonne les commandes par agence active. Les profils restent une ressource centrale globale héritée.

Fonctions backend non accessibles : lecture de l'historique des reçus (aucun endpoint), relation FK commande depuis la réponse véhicule, détails internes d'audit. Fonctions frontend non raccordées : aucune action majeure affichée n'est orpheline; en revanche, l'accès au sélecteur de versions peut échouer par divergence de permissions.

Les tests réels existants qualifient HTTP/MySQL, idempotence/concurrence, 10 fiches, réception 4 puis 6, VIN NULL et agence. Ils ne qualifient pas l'accessibilité navigateur, les libellés/états visuels, une pagination multi-page, la bascule d'agence UI ni la matrice complète de rôles. L'observation navigateur de cet audit s'est arrêtée à la page de connexion faute de compte de qualification fourni; aucune fausse capture n'a été produite.

Sources principales : `frontend/src/modules/vehicles/CommercialCatalogPage.tsx`, `VehiclesListPage.tsx`, `frontend/src/api/erpHooks.ts`, `backend-node/src/modules/vehicles/commercial-catalog.routes.ts`, `vehicle.routes.ts`, migrations 103/104/134, tests `evolution-lca-01*.test.ts`. Workflow : `10-workflow-existant.md`; matrice : `12-matrice-existant.md`; anomalies : `13-registre-incoherences.md`.

Confirmation : aucune correction, évolution, modification applicative, test, migration, donnée, ressource Docker, commit, push ou déploiement n'a été effectué.

