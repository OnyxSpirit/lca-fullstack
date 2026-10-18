# Rapport LOT B.3.4.3 — Garages et stock véhicules

Date de qualification : 18 octobre 2026  
Périmètre : référentiel des emplacements véhicules, paramètres de concession, stock et transferts.

## 1. Résumé exécutif

Le type `GARAGE` a été ajouté au référentiel existant `vehicle_locations`. Aucun module Atelier, aucune table « garages » et aucun second workflow de transfert n'ont été créés. Les garages utilisent les permissions, scopes, transactions, historiques et événements temps réel déjà appliqués aux parcs et showrooms.

Verdict : **VALIDÉ AVEC RÉSERVES**. La migration et le gestionnaire de migrations ont été validés sur MySQL 8.4.11 isolé; les tests ciblés, la matrice runtime véhicules, la suite frontend, les lints et les builds passent. La réserve porte sur l'absence de recette navigateur réelle et sur la suite backend globale, qui n'a pas produit de bilan complet dans le bac à sable malgré plusieurs échecs de fichiers historiques hors périmètre; les suites backend directement concernées passent.

## 2. État initial

- Dernière migration présente avant le lot : `092_service_stamp_document_types.sql`.
- Schéma historique : migration `050_vehicle_locations_and_sale_cost_snapshots.sql`.
- `vehicle_locations.type` acceptait `PARC` et `SHOWROOM`.
- Les contrôles HTTP et les types TypeScript reproduisaient cette liste fermée.
- Le transfert était déjà générique : contrôle d'agence et d'emplacement actif, verrou `FOR UPDATE`, transaction, mouvement et émission `vehicles:transferred`.
- Les écrans employaient parfois un ternaire qui présentait toute valeur non `PARC` comme « Showroom ».

## 3. Schéma SQL avant/après

Avant :

```sql
type ENUM('PARC','SHOWROOM') NOT NULL
```

Après :

```sql
type ENUM('PARC','SHOWROOM','GARAGE') NOT NULL
```

La table, ses identifiants, les lignes existantes, la contrainte d'unicité, l'index territorial et les clés étrangères sont conservés.

## 4. Migration créée

`backend-node/database/migrations/093_vehicle_location_garages.sql` effectue uniquement un `ALTER TABLE ... MODIFY COLUMN`. Elle ne contient aucune suppression, reconstruction explicite, mise à jour de données ni désactivation de contrainte. Le test du gestionnaire a été actualisé pour attendre la version courante 093 (la version 092 existait déjà mais son attente était restée à 091).

## 5. Routes et validations

La constante backend `VEHICLE_LOCATION_TYPES` centralise désormais `PARC`, `SHOWROOM`, `GARAGE`. Elle est utilisée par :

- consultation filtrée des emplacements;
- création d'un emplacement;
- options de filtre véhicules;
- liste filtrée du stock;
- validation du passage au statut `available`.

Le compteur `/vehicles/location-counts` expose en plus `garage`, calculé sur l'emplacement courant joint à `vehicles.vehicle_location_id`, jamais sur l'historique.

## 6. Paramètres de concession

L'interface existante permet désormais de sélectionner, créer, consulter, filtrer, renommer, désactiver et réactiver un garage. Le rattachement à l'agence reste obligatoire et contrôlé par les routes existantes. L'onglet est libellé « Parcs, Showrooms & Garages ».

## 7. Filtre Garage

Le module Stock véhicules présente les boutons dans l'ordre : Tout, Parc automobile, Showroom, Garage, Non affectés. Le compteur `garage` accompagne le bouton et la requête envoie `locationType=GARAGE`. La grille responsive comporte cinq colonnes au palier `sm` et conserve deux colonnes sur petit écran.

## 8. Transferts

Aucun nouveau workflow n'a été ajouté. Toutes les combinaisons impliquant GARAGE passent par `POST /vehicles/:id/transfer`. La destination est validée par identifiant, agence et état actif sans restriction de type. Le workflow conserve :

- permission `vehicles.assign_agency`;
- scopes AGENCY, CONCESSION et GLOBAL;
- refus du scope OWN;
- contrôle inter-agences;
- verrou du véhicule;
- transaction et rollback;
- refus d'une destination inactive, inexistante ou hors agence;
- historique `vehicle_movements`;
- événement `vehicles:transferred` dans les agences source et cible.

## 9. Statuts commerciaux

Le transfert ne modifie que `agency_id` et `vehicle_location_id`. Il ne change ni statut, ni prix, ni vente, ni réservation. Les véhicules vendus ou livrés restent verrouillés par `assertStockVehicleMutable`. GARAGE est accepté comme emplacement physique actif pour un véhicule disponible, sans rendre un véhicule automatiquement disponible.

## 10. Permissions et scopes

Aucune permission n'a été créée. Les permissions `vehicles.assignments.view`, `vehicles.assignments.manage`, `vehicles.view`, `vehicles.status.update` et `vehicles.assign_agency` restent appliquées. Les prédicats existants garantissent les périmètres agence, concession et global; OWN demeure non applicable au stock.

## 11. Historique et audit

Chaque transfert vers ou depuis un garage insère le même mouvement `transfer`, avec emplacement/agence source et cible, motif, utilisateur et date serveur. Un échec d'insertion provoque le rollback de la mise à jour du véhicule. Aucun mouvement historique n'est modifié.

## 12. Synchronisation

Le même événement Socket.IO `vehicles:transferred` est conservé. Le hook frontend invalide la liste véhicules, la fiche du véhicule et le tableau de bord. Les compteurs et options appartiennent à la clé de cache véhicules et sont donc invalidés avec le référentiel.

## 13. Tests frontend

- Tests ciblés Garage + stock existant : **3 fichiers PASS**.
- Suite frontend complète : **176 tests PASS, 0 FAIL, 0 SKIP**.
- TypeScript frontend : **PASS**.
- Build Vite : **PASS** (2 508 modules transformés).
- Contrats couverts : libellés français, création/modification/désactivation, ordre des boutons, compteur, filtre et responsive.

Le script `npm test` appelle le binaire CLI `tsx`, dont l'IPC Unix est refusé dans le bac à sable (`listen EPERM`). La suite a été rejouée sans altérer le code avec `node --import tsx --test ...`, et passe intégralement.

## 14. Tests backend

- Tests ciblés `vehicle-garages-b343`, `stock-vehicle-filters`, `stock-parc-recette-fix` : **3 fichiers PASS**.
- Matrice runtime `vehicle-scope-matrix` rejouée hors restriction locale : **105 tests PASS**; elle couvre permissions, scopes, transferts inter-agences et rollback transactionnel.
- TypeScript backend : **PASS**.
- Build backend : **PASS**.

La suite backend globale a été lancée dans le bac à sable. Plusieurs fichiers historiques sans rapport avec B.3.4.3 ont échoué au niveau fichier (notamment auth, CRM et PDF) et le lanceur n'a pas produit de récapitulatif final avant blocage; la campagne a été interrompue. Les tests directement concernés ont tous été rejoués isolément et passent.

## 15. Tests MySQL 8.4

Environnement : conteneur jetable `mysql:8.4` version 8.4.11, nommé `lca-b343-mysql-84`, stockage `tmpfs`, aucun volume, port local dédié `127.0.0.1:33343`. Le conteneur a été arrêté et supprimé après les tests; aucun service existant n'a été touché.

Résultats :

- migration additive depuis un schéma pré-093 avec lignes PARC/SHOWROOM : **PASS**;
- insertion GARAGE après migration : **PASS**;
- conservation des lignes : **PASS**;
- enum exact : **PASS**;
- conservation de deux index et deux clés étrangères : **PASS**;
- installation neuve complète jusqu'à 093 : **PASS**;
- second passage sans duplication : **PASS**;
- reprise après interruptions simulées : **PASS**;
- détection checksum : **PASS**;
- concurrence du gestionnaire : **PASS**.

Un premier essai de connexion a rencontré l'arrêt normal du serveur temporaire utilisé par l'entrypoint pendant l'initialisation. Après le message serveur « ready for connections » sur le port 3306, le même test a été rejoué et a passé.

## 16. Non-régression

- Lint frontend : PASS.
- Lint backend : PASS.
- Build frontend : PASS.
- Build backend : PASS.
- `git diff --check` : PASS.
- Aucun Docker Compose, volume métier, conteneur existant, base métier ou archive de livraison n'a été modifié.

## 17. Fichiers modifiés

- `backend-node/database/migrations/093_vehicle_location_garages.sql`
- `backend-node/src/modules/vehicles/vehicle.routes.ts`
- `backend-node/test/vehicle-garages-b343.test.ts`
- `backend-node/test/migration-093-mysql.integration.test.ts`
- `backend-node/test/mysql-migration-runner.test.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/types/index.ts`
- `frontend/src/modules/settings/SettingsPage.tsx`
- `frontend/src/modules/settings/VehicleLocationsSettings.tsx`
- `frontend/src/modules/vehicles/vehicleLocationPresentation.ts`
- `frontend/src/modules/vehicles/VehiclesListPage.tsx`
- `frontend/src/modules/vehicles/VehicleTransferModal.tsx`
- `frontend/src/modules/vehicles/EditVehicleModal.tsx`
- `frontend/src/modules/vehicles/VehicleDetailPage.tsx`
- `frontend/src/modules/vehicle-returns/VehicleReturnPage.tsx`
- `frontend/test/vehicle-garages-b343.test.ts`
- `docs/RAPPORT-GARAGES-STOCK-B343.md`

## 18. Modifications locales préservées

Le dépôt était propre au début de la mission. Les lots B.3.4.9, B.3.4.5 et B.3.4.7 présents dans l'état courant n'ont pas été réécrits ni annulés. Aucun reset, restore, stash, clean, changement de branche, commit ou push n'a été exécuté.

## 19. Réserves

1. Aucune recette navigateur réelle n'a été annoncée ni exécutée, conformément à l'absence de reconstruction/déploiement applicatif dans cette mission.
2. La suite backend globale reste à rejouer dans un environnement autorisant toutes ses primitives et avec une borne d'exécution maîtrisée; les échecs observés ne concernent pas les fichiers modifiés par B.3.4.3.

## 20. Verdict final

**VALIDÉ AVEC RÉSERVES.** L'évolution GARAGE est additive, préserve les données et les règles de sécurité, et son socle SQL/backend/frontend est qualifié. Les réserves ne portent pas sur une anomalie Garage démontrée, mais sur la recette navigateur non réalisée et l'absence de bilan complet de la suite backend globale dans le bac à sable.
