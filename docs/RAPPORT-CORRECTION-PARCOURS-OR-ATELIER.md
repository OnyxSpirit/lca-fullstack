# Rapport de correction — Parcours de création des OR Atelier

Date : 16 octobre 2026

## 1. Résumé des modifications

Les parcours « Véhicule interne » et « Véhicule extérieur » sont désormais distincts dans la modale de création d'OR, tout en conservant les référentiels centraux et `POST /repair-orders`.

- le parcours interne ne propose que les clients existants autorisés et leurs véhicules `CONCESSION` ;
- les véhicules `UNKNOWN` sont exclus explicitement, sans conversion ;
- le parcours extérieur propose la saisie manuelle du client et du véhicule ;
- la recherche temporisée des clients repose sur l'identité ou la raison sociale et reste limitée par `service.order.create` ;
- toute réutilisation d'un client ou véhicule exige une confirmation manuelle ;
- le VIN est recherché prioritairement, l'immatriculation seulement en complément ;
- le changement de parcours purge les données propres au parcours quitté ;
- le backend accepte un contrat d'origine optionnel et refuse les incohérences avec un code `VEHICLE_ORIGIN_MISMATCH` ;
- l'absence de ce champ conserve la compatibilité des anciens consommateurs.

## 2. Fichiers modifiés

- `frontend/src/modules/service/NewRepairOrderModal.tsx`
- `frontend/src/modules/service/repairOrderVehicleSelection.ts`
- `frontend/src/api/erpHooks.ts`
- `backend-node/src/modules/workshop/workshop.routes.ts`
- `frontend/test/repair-order-vehicle-selection.test.ts`
- `frontend/test/external-vehicle-reception.behavior.test.ts`

Fichiers de tests ajoutés :

- `frontend/test/repair-order-paths.behavior.test.ts`
- `backend-node/test/repair-order-path-separation.test.ts`

## 3. Parcours interne final — VALIDÉ

- recherche et sélection depuis `GET /repair-orders/customer-candidates` ;
- aucun bouton ni formulaire de création client ;
- véhicules associés récupérés par `GET /repair-orders/customer-vehicles` ;
- filtre strict sur `commercialOrigin === 'CONCESSION'` ;
- présélection conservée uniquement parmi les véhicules filtrés ;
- message explicite si des véhicules `UNKNOWN` sont écartés ;
- aucun formulaire de création véhicule ;
- création avec `expectedVehicleOrigin: 'CONCESSION'`.

## 4. Parcours extérieur final — VALIDÉ

- aucun sélecteur général de clients ou véhicules ;
- saisie particulier/entreprise, contact et ville ;
- formulaire manuel marque, modèle, version, immatriculation, VIN et relation ;
- création des éléments réellement manquants seulement à la soumission ;
- réutilisation explicite d'une fiche existante ;
- création avec `expectedVehicleOrigin: 'EXTERNAL'`.

## 5. Recherche client — VALIDÉ

Le frontend attend au moins deux caractères pour une raison sociale, ou au moins deux caractères dans chacun des prénom et nom. Après 350 ms, il appelle l'endpoint SAV spécialisé avec :

- `search` ;
- `customerType=individual|company`.

Le backend recherche `prénom + nom`, `nom + prénom` ou `company_name`, limite à 50 résultats et applique `serviceCustomerScope`. La collation MySQL existante assure la comparaison insensible à la casse et, selon la collation de colonne configurée, aux accents. Aucun rapprochement automatique n'est réalisé. Le téléphone est affiché pour distinguer les homonymes mais n'est pas le critère principal.

## 6. Recherche véhicule — VALIDÉ

- recherche VIN à partir d'une saisie suffisante ;
- recherche par immatriculation seulement si le VIN est absent ;
- seuls les résultats d'origine `EXTERNAL` sont proposés ;
- bouton explicite « Réutiliser ce véhicule » ;
- un VIN correspondant bloque la création d'un nouveau véhicule tant que la réutilisation n'est pas confirmée ;
- les contrôles backend existants sur normalisation, unicité VIN et ambiguïté d'immatriculation restent actifs.

## 7. Gestion des doublons — VALIDÉ

Les contraintes et contrôles existants ne sont pas contournés : identité client par agence, VIN unique, ambiguïté d'immatriculation, relation courante dupliquée et conflit de propriétaire. Aucun mécanisme de fusion automatique n'a été ajouté.

Limite : la confirmation d'une immatriculation ambiguë pour créer un véhicule distinct reste supportée par le backend, mais le nouveau parcours privilégie la détection et ne présente plus un sélecteur général.

## 8. Associations client/véhicule — VALIDÉ

- nouveau client + nouveau véhicule : création client, puis création extérieure et association transactionnelle ;
- client connu + nouveau véhicule : création du véhicule et association ;
- client connu + véhicule connu : vérification de la relation chargée, puis association via la route existante si nécessaire ;
- l'agence cible est celle du client confirmé, y compris en scope CONCESSION ou GLOBAL ;
- les conflits de propriétaire et doublons d'association restent autoritaires côté backend.

## 9. Validations backend — VALIDÉ

`POST /repair-orders` accepte désormais `expectedVehicleOrigin`, facultatif pour préserver les autres points d'entrée. Lorsqu'il est fourni :

- seules `CONCESSION` et `EXTERNAL` sont valides ;
- l'origine réelle du véhicule doit correspondre ;
- une divergence renvoie HTTP 409 avec `VEHICLE_ORIGIN_MISMATCH` ;
- le snapshot continue d'être produit depuis le véhicule réel, qui reste la source de vérité.

## 10. RBAC et scopes — VALIDÉ PAR CODE ET TESTS CIBLÉS

- candidats client : `service.order.create`, scopes OWN/AGENCY/CONCESSION/GLOBAL existants ;
- création client : `customers.create` ;
- recherche véhicule : `workshop.vehicles.view` ;
- création extérieure : `workshop.external_vehicle.create`, `workshop.vehicle.associations.create` et `workshop.vehicles.view` ;
- association : permissions existantes ;
- conseiller : `service.order.assign_advisor` lorsque nécessaire.

Aucune permission, attribution ou rôle n'a été ajouté.

## 11. Tests exécutés

### VALIDÉ

- frontend ciblé : 3 fichiers, tous réussis ;
- backend ciblé : 2 fichiers, tous réussis ;
- lint frontend : réussi ;
- build frontend Vite : réussi, 2 499 modules transformés ;
- lint backend : réussi ;
- build backend TypeScript : réussi ;
- `git diff --check` : réussi après correction de l'espace terminal.

### SUITE GLOBALE — BLOQUÉE PAR L'ÉTAT ANTÉRIEUR

La suite frontend globale a exécuté 849 tests : 763 réussis et 86 échecs. Les nouveaux tests OR ont tous réussi. Les échecs restants concernent de nombreux modules préexistants (RH, GED, Treasury, anciennes attentes SAV, etc.) et ne sont pas imputables à cette correction. Ils ne sont pas déclarés validés.

Une première exécution via le script `tsx` a nécessité une autorisation hors sandbox pour son socket IPC temporaire. Les tests ciblés ont ensuite été exécutés directement avec `node --import tsx`.

## 12. Résultats

- séparation visuelle et fonctionnelle : VALIDÉE ;
- filtrage des origines : VALIDÉ ;
- protection backend : VALIDÉE ;
- recherche et confirmation client : VALIDÉES par tests statiques ciblés et compilation ;
- recherche et confirmation véhicule : VALIDÉES par tests statiques ciblés et compilation ;
- compatibilité de compilation : VALIDÉE ;
- écriture réelle MySQL : NON TESTÉE, conformément à l'interdiction d'utiliser la base métier ;
- recette navigateur sur code reconstruit : NON TESTÉE, aucune reconstruction Docker autorisée.

## 13. Anomalies restantes

- la suite globale contient 86 échecs préexistants hors périmètre ;
- le workflow multi-appels du parcours extérieur peut créer une fiche client avant qu'une étape ultérieure échoue. Aucune donnée fictive n'est créée, mais l'atomicité globale client + véhicule + OR n'est pas assurée par une transaction unique inter-routes ;
- la recherche par accents dépend de la collation MySQL réellement déployée ; le schéma baseline utilise des collations insensibles aux accents pour les identités normalisées, mais aucune recette sur la base métier n'a été effectuée.

## 14. Points nécessitant une décision métier

### À CLARIFIER

- faut-il rendre le prénom obligatoire à la création d'un particulier, alors que le backend historique exige uniquement le nom ? La correction n'ajoute pas cette obligation ;
- faut-il exposer davantage de caractéristiques du véhicule extérieur (année, couleur, carburant), déjà acceptées par le backend ?
- faut-il rendre atomique l'ensemble client + véhicule + association + OR via une route orchestratrice dédiée ? Cela dépasserait la correction ciblée actuelle.

## 15. Instructions de recette manuelle

Sur un environnement isolé, après autorisation de reconstruction :

1. ouvrir la modale Nouvel OR ;
2. vérifier qu'en interne aucun champ de création client/véhicule n'apparaît ;
3. sélectionner un client avec véhicules `CONCESSION`, `EXTERNAL` et `UNKNOWN` et vérifier que seul `CONCESSION` est proposé ;
4. basculer vers extérieur et vérifier que les sélections internes disparaissent ;
5. saisir deux homonymes et confirmer manuellement la bonne fiche ;
6. choisir « Continuer avec un nouveau client » et vérifier les validations de contact ;
7. saisir un VIN existant, confirmer sa réutilisation et vérifier l'association ;
8. saisir un véhicule nouveau et vérifier sa création `EXTERNAL`, non commerciale ;
9. revenir vers interne et vérifier l'absence de valeurs résiduelles ;
10. créer chaque type d'OR et contrôler le snapshot d'origine, la garantie, le conseiller, la fiche 360 et l'historique Atelier ;
11. tester les profils OWN, AGENCY, CONCESSION et GLOBAL ainsi qu'un refus de chaque permission spécialisée ;
12. vérifier qu'aucun client ou véhicule hors périmètre n'est présenté.

## Contraintes respectées

Aucune migration, écriture MySQL métier, reconstruction Docker, modification de volume, déploiement, commit, push, reset, restore, stash, clean ou changement de branche n'a été effectué. L'archive officielle n'a pas été modifiée.
