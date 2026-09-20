# Stock Véhicules — filtres Marque/Modèle et disponibilité

Validation réalisée le 15 septembre 2026 sur l’architecture Express, React,
TanStack Query et MySQL 8.4 existante.

## Comportement

Avant cette évolution, l’API acceptait les filtres vue, agence, statut, type,
énergie, emplacement, stock dormant, recherche, tri et pagination. La page React
ne recevait cependant que les éléments de la page courante : le `total` déjà
calculé par MySQL était perdu dans le hook. Aucun filtre Marque/Modèle dédié
n’était proposé. Le KPI utilisait déjà l’agrégat MySQL du statut `available`.

Après cette évolution :

- `brandId` et `modelId` complètent les paramètres de `GET /vehicles` ;
- les clauses SQL utilisent exclusivement des paramètres et se combinent avec
  le scope et tous les filtres antérieurs ;
- `GET /vehicles/filter-options` retourne uniquement les marques et modèles
  présents dans les véhicules accessibles, selon la vue active/vendus/tous ;
- lorsque la marque change, le modèle revient à « Tous modèles » ; sans marque,
  tous les modèles accessibles sont proposés. Ce choix permet une recherche
  directe par modèle tout en restant cohérent avec les listes existantes ;
- lorsqu’une marque est sélectionnée, l’API ne retourne que ses modèles ;
- le bouton Réinitialiser restaure la recherche, la vue active et tous les
  filtres, dont Marque et Modèle ;
- `useVehicleListQuery` conserve `items`, `total`, `page` et `pageSize`. Le hook
  historique `useVehiclesQuery` reste compatible avec ses consommateurs ;
- le compteur affiche le total MySQL, avec accord au singulier/pluriel, même si
  une page ne contient qu’une partie des résultats ;
- les query keys incluent l’objet complet des filtres et les options dépendantes ;
- les KPI restent globaux dans le scope courant et ne varient pas avec les
  filtres Marque/Modèle de la liste.

## Statuts et définition métier

Les seuls statuts réels du schéma sont `ordered`, `in_transit`, `received`,
`preparation`, `available`, `reserved`, `sold` et `delivered`.

« Disponible à la vente » signifie exactement : véhicule non archivé dont le
statut persistant est `available`, dans le scope `vehicles.view` courant. Tous
les autres statuts sont exclus. En particulier, `reserved`, `sold` et
`delivered` sont non commercialisables ; `ordered`, `in_transit`, `received` et
`preparation` ne sont pas encore commercialisables.

Le workflow Vente verrouille un véhicule `available`, puis le passe à
`reserved` lors de la création de la vente. C’est le moment où il cesse d’être
proposable à une nouvelle vente et où le KPI diminue. La progression de la vente
jusqu’à `confirmed` passe ensuite le véhicule à `sold`; la livraison signée le
passe à `delivered`. Un devis seul ne modifie pas le statut du véhicule.

L’API Stats expose désormais le nom explicite `availableForSale`, tout en
conservant `available` pour compatibilité. Le calcul reste autoritaire dans
MySQL. Les mutations de vente locales invalident déjà `erpKeys.vehicles`; les
événements realtime `sales:created` et `sales:status` invalident maintenant la
liste, ses options, son total et ses KPI pour les autres sessions.

## Recette MySQL 8.4 et API réelle

Jeu synthétique jetable : Toyota Hilux disponible, Toyota Hilux vendu, Toyota
Corolla disponible, Hyundai Tucson disponible dans une seconde agence de la
même concession, et Ford Ranger disponible dans une autre concession.

| Scénario | Résultat |
| --- | ---: |
| AGENCY, vue active, sans nouveau filtre | 2 |
| AGENCY, vue tous | 3 |
| Toyota, vue tous | 3 |
| Toyota + Hilux, vue active | 1 |
| Toyota + Hilux + vendu | 1 |
| Modèle inexistant | 0 |
| Pagination, éléments de la page | 1 |
| Pagination, total backend | 2 |
| CONCESSION, vue tous | 4 |
| GLOBAL, vue tous | 5 |
| KPI avant vente | 2 |
| KPI après réservation par création de vente | 1 |
| KPI après confirmation et statut véhicule vendu | 1 |

Les options AGENCY ne contiennent que Toyota. Pour Toyota, elles contiennent
uniquement Corolla et Hilux. Aucun filtre n’élargit le scope.

## Fichiers et validation

Backend : `backend-node/src/modules/vehicles/vehicle.routes.ts`.

Frontend : `frontend/src/api/erpHooks.ts`,
`frontend/src/modules/vehicles/VehiclesListPage.tsx` et
`frontend/src/components/AppBootstrap.tsx`.

Tests : `backend-node/test/stock-vehicle-filters.test.ts`,
`backend-node/test/stock-vehicle-mysql-fixture.sql`,
`backend-node/test/stock-vehicle-mysql.integration.py` et
`frontend/test/stock-vehicle-filters.test.ts`.

- tests ciblés backend : 25/25 ;
- tests ciblés frontend : 43/43 ;
- lint backend et frontend : succès ;
- build backend et frontend : succès ;
- Docker : MySQL, backend et frontend démarrés ;
- navigateur intégré : page React chargée sans erreur jusqu’à l’écran de connexion ;
- `git diff --check` : succès.

Le build Vite conserve l’avertissement préexistant sur un bundle supérieur à
500 kB. La recette visuelle authentifiée n’a pas été automatisée dans le
navigateur ; le comportement fonctionnel de l’écran est couvert par les tests
frontend et la recette API réelle.

**STOCK VÉHICULES — FILTRES MARQUE/MODÈLE + COMPTEUR + DISPONIBILITÉ — VALIDÉ**
