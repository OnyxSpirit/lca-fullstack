# Rapport d'audit — Création d'un ordre de réparation Atelier

Date de l'audit : 16 octobre 2026  
Nature : audit statique fonctionnel et technique, sans modification applicative, Docker ou MySQL

## 1. Résumé exécutif

La création d'un OR repose actuellement sur un formulaire React unique, `NewRepairOrderModal`, et sur une route backend unique, `POST /repair-orders`. Les libellés « Véhicule interne » et « Véhicule extérieur » ne sont qu'un état d'interface : le payload de création ne contient aucun type de parcours. Le backend détermine et historise l'origine commerciale à partir du véhicule central sélectionné.

Les clients internes et extérieurs partagent la table centrale `customers`. Les véhicules internes et extérieurs partagent la table centrale `vehicles`; un véhicule extérieur est marqué `commercial_origin='EXTERNAL'`, `commercial_origin_source='WORKSHOP'` et `is_commercial_stock=FALSE`. Leur relation persistante est portée par `customer_vehicles`. Un client et un véhicule extérieurs disposent donc d'identifiants pérennes, sont réutilisables et alimentent la fiche client 360 ainsi que l'historique Atelier.

La règle métier future n'est pas respectée par l'interface actuelle :

- en mode interne, le bouton et le formulaire « Nouveau client » restent visibles ;
- en mode extérieur, le sélecteur de clients existants, le sélecteur des véhicules du client et la recherche/association de véhicules existants restent visibles ;
- changer de mode ne réinitialise aucune sélection ni donnée temporaire ;
- rien ne garantit que l'origine du véhicule sélectionné corresponde au libellé du mode affiché.

Le backend protège néanmoins l'intégrité référentielle : le client doit être dans le périmètre SAV, le véhicule doit être relié au client dans l'agence, le conseiller doit être éligible et les créations extérieures/associations sont transactionnelles. Le principal écart est donc sémantique et UX, avec un risque réel de créer un OR classé avec une origine différente de l'onglet choisi.

## 2. Architecture frontend actuelle

### Composant et états

Le composant unique est `frontend/src/modules/service/NewRepairOrderModal.tsx` (`NewRepairOrderModal`, lignes 20-58).

- `mode: 'internal' | 'external'` pilote uniquement l'affichage du bloc de recherche/création de véhicule extérieur (lignes 11, 25, 47, 52-53).
- `form` contient `customerId`, `customerName`, `vehicleId`, `mileage`, `promisedCompletionDate`, `symptomsReported` et `diagnosticNotes` (ligne 22).
- `customerForm` contient type, civilité, prénom, nom, raison sociale, e-mail, téléphone et ville (lignes 12, 23, 26).
- `externalForm` contient marque, modèle, version, immatriculation, VIN et type de relation (lignes 13, 24, 28).
- les recherches client et véhicule sont temporisées de 350 ms (lignes 35-36).
- à la fermeture seulement, le formulaire commun, le mode, les panneaux de création et le conflit sont partiellement réinitialisés (ligne 37).

### Hooks et appels

Les hooks sont définis dans `frontend/src/api/erpHooks.ts` :

| Hook | Route | Usage |
|---|---|---|
| `useCustomersQuery` | `GET /customers` | recherche/sélection client (lignes 442-451) |
| `useRepairOrderCustomersQuery` | `GET /repair-orders/customer-candidates` | existe mais n'est pas utilisé par la modale (ligne 739) |
| `useCreateCustomer` | `POST /customers` | création du client central (ligne 718) |
| `useCustomerServiceVehiclesQuery` | `GET /repair-orders/customer-vehicles` | véhicules liés/historiques du client (ligne 741) |
| `useWorkshopVehicleSearchQuery` | `GET /workshop/vehicles/search` | recherche véhicule en mode extérieur (ligne 744) |
| `useCreateWorkshopExternalVehicle` | `POST /workshop/external-vehicles` | création et association atomiques (ligne 745) |
| `useCreateWorkshopVehicleAssociation` | `POST /workshop/vehicle-associations` | association d'un véhicule existant (ligne 746) |
| `useAdvisorCandidatesQuery` | `GET /repair-orders/advisor-candidates` | conseiller SAV (ligne 740) |
| `useVehicleWarrantyEligibilityQuery` | `GET /repair-orders/vehicles/:id/warranty-eligibility` | contexte garantie (ligne 750) |
| `useCreateRepairOrder` | `POST /repair-orders` | ouverture de l'OR (lignes 747-748) |

La sélection automatique d'un véhicule unique ou préféré est déléguée à `selectCustomerVehicle` dans `frontend/src/modules/service/repairOrderVehicleSelection.ts` et appliquée par l'effet de la ligne 39 de la modale.

## 3. Architecture backend actuelle

Les routes Atelier principales sont dans :

- `backend-node/src/modules/workshop/workshop.routes.ts` : candidats, véhicules client, garantie et création d'OR ;
- `backend-node/src/modules/workshop/workshop-vehicle.routes.ts` : recherche véhicule, création extérieure, association et historique d'association ;
- `backend-node/src/modules/customers/customer.routes.ts` : recherche/création client et fiche 360.

Il n'existe pas de contrôleur séparé « OR interne » / « OR extérieur ». `POST /repair-orders` :

1. résout le périmètre du client avec `serviceCustomerAgency` ;
2. valide le kilométrage et la date promise ;
3. vérifie en SQL la relation client/véhicule par association courante, vente ou OR historique ;
4. copie `commercial_origin` et `commercial_origin_source` du véhicule dans l'OR ;
5. contrôle le conseiller et, si nécessaire, `service.order.assign_advisor` ;
6. crée transactionnellement l'OR, son premier historique et éventuellement le dossier de garantie ;
7. clôt un rendez-vous compatible et émet l'événement temps réel.

Références : `workshop.routes.ts`, lignes 472-525, fonctions `serviceCustomerScope`/`serviceCustomerAgency` lignes 185-197.

## 4. Tables MySQL concernées

Structures vérifiées dans `backend-node/database/baseline/001_initial_schema.sql` et la migration `070_vehicle_commercial_origin.sql`.

### `customers`

- PK : `id`.
- FK : `agency_id`, `assigned_user_id`, `created_by`.
- identité : type, civilité, prénom, nom, raison sociale, e-mail, téléphone, adresse et qualification CRM.
- unicité : `customer_code`; e-mail normalisé par agence; téléphone normalisé par agence.
- index : e-mail, téléphone, agence, affectation et classification.

Référence : baseline, lignes 459-507. Les contraintes normalisées réduisent les doublons mais seulement dans une agence donnée.

### `vehicles`

- PK : `id`.
- FK : version catalogue optionnelle, agence, emplacements, créateur.
- origine : `commercial_origin`, `commercial_origin_source`, `is_commercial_stock`.
- identité libre : marque, modèle et version si aucune version catalogue.
- VIN nullable mais unique ; `stock_number` unique ; immatriculation non unique.
- contrainte : version catalogue ou marque et modèle libres obligatoires.
- index d'origine et de stock commercial.

Référence : baseline, lignes 723-790 ; migration 070, lignes 1-19.

### `customer_vehicles`

- PK : `id`; FK vers client, véhicule, agence et créateur.
- relation : `OWNER`, `DRIVER`, `RESPONSIBLE` ou `FLEET`.
- source : `SALE`, `REPAIR_ORDER`, `MANUAL` ou `IMPORT`.
- unicité d'une relation courante par client/véhicule/type via `current_relation_key`.
- contrainte de cohérence entre `is_current`, `valid_from` et `valid_to`.

Référence : baseline, lignes 792-818 ; migration 070, lignes 21-50.

### `repair_orders`

- PK : `id`; numéro d'OR unique.
- FK vers rendez-vous, client, véhicule, agence, conseiller, véhicule de courtoisie et utilisateurs d'audit.
- snapshots `vehicle_commercial_origin` et `vehicle_origin_source`.
- données de création : kilométrage, plainte, diagnostic, garantie, statut, fin promise.
- index `(agency_id, vehicle_commercial_origin, created_at)`.

Référence : baseline, lignes 1141-1187 ; migration 070, lignes 52-55.

Les interventions, lignes facturables, inspections, garanties et historiques utilisent ensuite l'`id` de l'OR. Aucun stockage propre au formulaire « extérieur » n'a été constaté.

## 5. Parcours actuel — véhicule interne

1. L'utilisateur choisit l'onglet interne, mode par défaut.
2. Il recherche un client via `GET /customers`, donc sous permission et scope `customers.view`.
3. Il peut sélectionner un client existant **ou créer un nouveau client**, contrairement à la règle future.
4. `GET /repair-orders/customer-vehicles?customerId=...` retourne les véhicules associés, vendus au client ou déjà utilisés dans un OR.
5. S'il n'y a qu'un véhicule, il peut être présélectionné automatiquement.
6. L'utilisateur renseigne conseiller, kilométrage, fin promise et motif ; le diagnostic existe dans l'état/payload mais aucun champ d'édition correspondant n'est rendu dans la portion actuelle du formulaire.
7. `POST /repair-orders` réalise les validations communes et ouvre l'OR.

Le client et le véhicule doivent exister avant l'appel final. La modale peut créer le client, mais elle ne propose pas de création de véhicule en mode interne. Le véhicule doit être lié au client par relation courante, vente ou historique d'OR, et être dans l'agence ou relié au client dans cette agence.

La liste ne filtre pas `commercialOrigin='CONCESSION'` : un véhicule extérieur ou d'origine inconnue déjà lié au client peut être choisi depuis l'onglet interne.

## 6. Parcours actuel — véhicule extérieur

1. Le même bloc client reste affiché : recherche, sélecteur et bouton « Nouveau client ».
2. Le même sélecteur des véhicules déjà connus du client reste affiché.
3. Un bloc supplémentaire permet de rechercher tout véhicule accessible par VIN, immatriculation, marque ou modèle.
4. Un véhicule trouvé peut être sélectionné s'il est déjà lié, ou associé au client avec un type de relation.
5. Le formulaire manuel peut créer un véhicule extérieur puis l'associer dans une seule transaction.
6. Le même `POST /repair-orders` crée l'OR.

Le client extérieur est un client central. Le véhicule extérieur est un véhicule central doté d'un identifiant, réutilisable. Les vues « clients extérieurs » ne reposent pas sur une table distincte : elles sélectionnent les clients ayant des OR dont le snapshot vaut `EXTERNAL` (`workshop.routes.ts`, lignes 380-395).

La recherche n'est pas limitée aux véhicules `EXTERNAL`; elle expose toute origine accessible. Un véhicule concession peut donc être associé et sélectionné depuis l'onglet extérieur. Le backend enregistrera correctement son origine réelle, pas le mode UI.

## 7. Champs et actions par parcours

### Communs aux deux modes

- conseiller SAV : obligatoire fonctionnellement ; sélecteur seulement avec `service.order.assign_advisor`, sinon affichage du conseiller retenu ;
- recherche et sélecteur de client ;
- bouton et formulaire nouveau client si `customers.create` ;
- sélecteur de véhicule existant ;
- kilométrage : entier positif ou nul ; vide est refusé au submit, malgré l'absence d'astérisque ;
- fin promise : facultative ;
- motif/symptômes : obligatoire en HTML et au backend (`txt(..., true)`) ;
- panneau d'éligibilité garantie ;
- Annuler / Ouvrir l'OR.

### Création client

- particulier : nom obligatoire, prénom facultatif ;
- professionnel : raison sociale obligatoire ;
- téléphone ou e-mail obligatoire ;
- civilité et ville ; pays forcé à `Congo` par la modale.

### Spécifiques au mode extérieur

- recherche : VIN, immatriculation, marque, modèle ;
- type de relation lors d'une association ;
- création : marque et modèle obligatoires ; version, immatriculation et VIN facultatifs ; relation obligatoire avec valeur par défaut `OWNER`.

Le backend accepte davantage de caractéristiques de véhicule (type, année, première mise en circulation, couleurs, carburant, moteur, transmission, puissances, CO2, kilométrage, notes), mais la modale ne les expose pas (`workshop-vehicle.routes.ts`, route de création, lignes 53-65).

## 8. Gestion des clients

`POST /customers` valide le type, les champs d'identité, les formats e-mail/téléphone, l'agence et les doublons d'identité, puis crée un code `CLI-xxxxxx` dans une transaction (`customer.routes.ts`, lignes 68-94).

La création depuis la modale est identique pour les deux modes. Il n'existe ni statut ni table « client extérieur ». La qualification extérieure apparaît seulement après un OR utilisant un véhicule dont le snapshot d'origine vaut `EXTERNAL`.

La fiche 360 agrège les véhicules et OR de ce client selon les permissions de chaque section (`GET /customers/:id/360`, `customer.routes.ts`, lignes 124-150). Les nouvelles fiches et leurs OR sont donc synchronisés avec le référentiel client 360.

Point de conception : la modale utilise `GET /customers`, protégé par `customers.view`, alors qu'un endpoint spécialisé `GET /repair-orders/customer-candidates`, protégé par `service.order.create`, existe déjà. Cette divergence peut rendre l'interface inutilisable pour un profil autorisé à créer un OR mais privé de `customers.view`.

## 9. Gestion des véhicules

Les véhicules de vente et les véhicules Atelier partagent `vehicles`. Les véhicules de concession sont issus du stock/référentiel central; les véhicules extérieurs créés par l'Atelier y sont ajoutés sans stock commercial.

Contrôles de doublons :

- VIN : normalisé, vérifié avant insertion et protégé par l'unicité SQL ;
- immatriculation : normalisée pour la recherche, mais non unique en SQL ; une correspondance déclenche une ambiguïté 409 que l'utilisateur peut confirmer ;
- marque/modèle : recherche approximative uniquement, aucune unicité ;
- association : doublon courant client/véhicule/type interdit ; un second propriétaire courant pour le même véhicule est interdit applicativement.

La recherche Atelier applique `workshop.vehicles.view`, ignore les véhicules archivés et combine le scope propre du véhicule avec les associations client/véhicule accessibles (`workshop-vehicle.routes.ts`, lignes 18-40).

## 10. Associations client/véhicule

`insertAssociation` vérifie l'agence, le client sous `customers.view`, l'existence et la visibilité du véhicule, le doublon exact et le conflit de propriétaire, puis écrit `customer_vehicles` et une trace d'audit dans la même transaction.

La création d'un véhicule extérieur appelle cette fonction dans sa propre transaction : véhicule et relation sont créés ensemble ou aucun des deux ne l'est. L'association d'un véhicule existant passe par `POST /workshop/vehicle-associations`.

La création finale de l'OR n'ajoute pas automatiquement une association. Elle accepte toutefois une vente ou un OR historique comme preuve de liaison. Cela maintient la compatibilité historique, mais signifie qu'un lien exploitable par l'OR n'est pas toujours matérialisé par `customer_vehicles`.

## 11. Routes et payloads API

### Création client

```json
{
  "customerType": "individual|company",
  "civility": "M.|Mme|Société",
  "firstName": "...",
  "lastName": "...",
  "companyName": "...",
  "email": "...",
  "phone": "...",
  "city": "...",
  "country": "Congo",
  "agencyId": "..."
}
```

### Création véhicule extérieur

Payload UI réel : `customerId`, `agencyId`, `brand`, `model`, `version`, `vin`, `registrationNumber`, `relationType`, et éventuellement `confirmRegistrationAmbiguity`.

Réponse : `vehicleId`, `associationId`.

### Association véhicule existant

```json
{
  "customerId": "...",
  "vehicleId": "...",
  "agencyId": "...",
  "relationType": "OWNER|DRIVER|RESPONSIBLE|FLEET"
}
```

### Création OR

```json
{
  "customerId": "...",
  "vehicleId": "...",
  "mileage": 0,
  "advisorId": "...",
  "complaint": "...",
  "diagnosisSummary": "...",
  "promisedCompletionAt": "YYYY-MM-DD HH:mm"
}
```

Le backend accepte aussi `appointmentId`, non envoyé par cette modale. Aucun champ `mode`, `internal` ou `external` n'est envoyé.

## 12. Permissions RBAC

| Action | Permission actuelle | Scope appliqué |
|---|---|---|
| rechercher/sélectionner un client dans la modale | `customers.view` | OWN : portefeuille affecté ; AGENCY ; CONCESSION ; GLOBAL |
| créer un client | `customers.create` | agence résolue selon OWN/AGENCY/CONCESSION/GLOBAL |
| obtenir candidats/véhicules client/créer OR | `service.order.create` | OWN : agence + client affecté à l'utilisateur ; AGENCY ; CONCESSION ; GLOBAL |
| rechercher un véhicule Atelier | `workshop.vehicles.view` | OWN/AGENCY/CONCESSION/GLOBAL, avec extension par association accessible |
| créer un véhicule extérieur | `workshop.external_vehicle.create` **et** `workshop.vehicle.associations.create` **et** `workshop.vehicles.view` | agence selon scope de création ; client sous `customers.view` |
| associer un véhicule existant | `workshop.vehicle.associations.create` **et** `workshop.vehicles.view` | agence et véhicule selon scopes ; client sous `customers.view` |
| affecter un autre conseiller | `service.order.assign_advisor` | OWN explicitement insuffisant ; agence/concession/global selon cible |

Les permissions Atelier dédiées ont été introduites par `backend-node/database/migrations/071_workshop_external_vehicle_permissions.sql` sans attribution automatique à un rôle.

Les parcours diffèrent donc réellement en droits : l'interne nécessite surtout `customers.view` dans l'UI et `service.order.create`; l'extérieur exige en plus les capacités véhicule/association et, pour créer le client, `customers.create`.

## 13. Dépendances intermodules

- **CRM / Clients 360** : référentiel `customers`, recherche générale, historique client, véhicules et OR.
- **Stock véhicules** : table `vehicles` commune; drapeau `is_commercial_stock` évite qu'un extérieur devienne un véhicule commercial.
- **Ventes** : une vente peut prouver la relation client/véhicule et les véhicules vendus alimentent la sélection.
- **SAV / Atelier** : OR, conseiller, planning, statut, réception, interventions et facturation ultérieure.
- **Garantie constructeur** : éligibilité avant création et initialisation d'un dossier si éligible.
- **Rendez-vous SAV** : support backend via `appointmentId`, absent du payload de la modale auditée.
- **GED** : aucun document n'est créé par la modale; les documents client/OR sont consommés ailleurs selon RBAC.
- **Temps réel et audit** : émission `workshop:repair-order-created`; audit explicite pour véhicule et association.

## 14. Anomalies et risques identifiés

### Anomalies confirmées

1. **Mode interne non conforme à la règle future** : création manuelle d'un client visible et possible (lignes 49-50).
2. **Mode extérieur non conforme à la règle future** : sélecteurs de client et véhicule existants visibles (lignes 49-52).
3. **Mode purement visuel** : aucune validation ne rapproche `mode` de `commercialOrigin`; un OR créé dans l'onglet interne peut être `EXTERNAL`, et inversement.
4. **Changement de mode sans purge** : le bouton appelle uniquement `setMode(value)` (ligne 47). Client, véhicule, formulaires, recherches, relation et conflits restent en mémoire.
5. **Hook client non spécialisé** : la modale ignore `useRepairOrderCustomersQuery`, ce qui ajoute une dépendance RBAC à `customers.view` et peut désaligner les scopes de consultation et de création SAV.
6. **Diagnostic non saisissable** : `diagnosticNotes` existe dans l'état et le payload mais aucun champ correspondant n'est rendu dans le formulaire observé.

### Risques potentiels

1. La présélection automatique d'un véhicule unique après sélection/création de client peut aboutir à une origine contraire au mode affiché.
2. Une immatriculation n'étant pas unique, la confirmation d'ambiguïté peut créer un doublon réel si l'opérateur se trompe.
3. La recherche par marque/modèle peut retourner plusieurs homonymes et autorise l'association d'un véhicule de toute origine.
4. Les données masquées du formulaire extérieur survivent au passage en interne et peuvent réapparaître si l'utilisateur revient en extérieur.
5. Le format `datetime-local` est envoyé sans offset explicite; l'interprétation dépend du contrat de `dateTime`, hors objectif principal de cet audit.

### Comportements conformes

1. Client, véhicule, association et OR possèdent des identifiants persistants et des FK.
2. Le VIN est protégé contre les doublons et la structure existante est réutilisée plutôt que dupliquée.
3. La relation client/véhicule est contrôlée avant l'OR.
4. Les écritures véhicule extérieur + association, puis OR + historique/garantie, sont transactionnelles.
5. L'origine est copiée dans l'OR, préservant l'historique même si le véhicule évolue ensuite.
6. Les véhicules extérieurs sont exclus du stock commercial par construction.

### Points à clarifier

1. « Interne » signifie-t-il strictement `CONCESSION`, ou faut-il accepter `UNKNOWN` historique ?
2. Un véhicule extérieur déjà connu doit-il réellement être impossible à réutiliser dans le nouveau parcours, malgré l'exigence de réutilisabilité métier ?
3. Un client extérieur déjà connu doit-il être recréé à chaque passage, ou recherché implicitement après contrôle de doublon ?
4. Le diagnostic doit-il être saisi à l'ouverture ou uniquement lors de l'étape diagnostic ?
5. Le kilométrage doit-il être explicitement obligatoire dans le libellé ?

## 15. Comparaison avec les règles souhaitées

| Exigence future | État actuel | Verdict |
|---|---|---|
| Interne : client existant seulement | sélection + création possible | écart confirmé |
| Interne : véhicule associé seulement | liste liée/historique, pas de création | globalement conforme, mais aucune restriction d'origine |
| Interne : aucune saisie client | formulaire manuel disponible | écart confirmé |
| Extérieur : création manuelle client | disponible | conforme mais non exclusive |
| Extérieur : création manuelle véhicule | disponible | conforme mais non exclusive |
| Extérieur : association au client | transactionnelle | conforme |
| Extérieur : aucun client existant | sélecteur présent | écart confirmé |
| Extérieur : aucun véhicule existant | sélecteur + recherche/association présents | écart confirmé |
| Deux parcours cohérents côté backend | une route commune, origine dérivée | techniquement robuste, mais contrat de mode absent |

## 16. Fichiers concernés par une future correction

Sans les modifier dans cet audit :

- `frontend/src/modules/service/NewRepairOrderModal.tsx` : séparation des champs/actions, resets et restriction par origine ;
- `frontend/src/modules/service/repairOrderVehicleSelection.ts` et ses tests : politique de présélection ;
- `frontend/src/api/erpHooks.ts` : usage du endpoint candidat et éventuels contrats de parcours ;
- `backend-node/src/modules/workshop/workshop.routes.ts` : si un contrat explicite de type/origine doit être imposé ;
- `backend-node/src/modules/workshop/workshop-vehicle.routes.ts` : si la réutilisation/recherche extérieure doit changer ;
- tests frontend et backend associés ;
- aucune migration n'est a priori nécessaire pour une séparation purement fonctionnelle, les modèles centraux portant déjà l'information.

## 17. Recommandations techniques

1. Définir d'abord la sémantique métier de `internal` et `external`, notamment pour `UNKNOWN` et les véhicules extérieurs déjà connus.
2. Rendre les sections client/véhicule réellement exclusives dans la modale, avec un état de formulaire discriminé par mode.
3. À chaque changement de mode, réinitialiser explicitement client, véhicule, recherche, formulaires, conflits et préférence, ou conserver deux brouillons séparés si cela est souhaité.
4. Utiliser l'endpoint spécialisé des candidats OR, ou aligner explicitement ses scopes avec `customers.view`.
5. Ajouter une validation backend explicite de l'origine attendue seulement si l'exigence métier impose une barrière de sécurité; ne jamais se fier au seul affichage React.
6. Préserver les tables centrales, les transactions, les snapshots d'origine et les contrôles de doublons existants.
7. Ajouter des tests de changement de mode, de permissions combinées et de couples mode/origine avant toute correction.

## 18. Questions fonctionnelles à clarifier

1. Un véhicule `UNKNOWN` doit-il être proposé dans le parcours interne, bloqué, ou faire l'objet d'une régularisation ?
2. Si un client extérieur revient, faut-il le recréer manuellement comme l'exigence littérale le suggère, ou retrouver sa fiche centrale pour éviter un doublon ?
3. Même question pour un véhicule extérieur déjà enregistré : le masquer du sélecteur paraît contradictoire avec sa réutilisabilité.
4. La création d'un client extérieur doit-elle rester soumise à `customers.create` ou disposer d'une permission Atelier dédiée ?
5. Quels champs véhicule supplémentaires sont obligatoires métier (année, couleur, type, carburant, kilométrage) ?
6. L'association extérieure doit-elle toujours être `OWNER`, ou les quatre relations restent-elles proposées ?
7. Le mode doit-il être persistant/audité, ou l'origine du véhicule suffit-elle comme vérité métier ?
8. Faut-il autoriser une agence à prendre en charge un véhicule central rattaché à une autre agence sans relation locale préalable ?

## 19. Conclusion

L'implémentation actuelle repose sur un modèle central cohérent et réutilisable : un client, un véhicule, une association et un OR, avec intégrité transactionnelle et snapshots d'origine. Elle ne matérialise toutefois pas deux parcours métier étanches. Les onglets sont des variantes d'affichage partageant les mêmes sélections et la même route, et l'origine effective dépend exclusivement du véhicule.

La future correction devra donc porter principalement sur la séparation des expériences frontend et sur un contrat métier explicite concernant l'origine, sans dupliquer les référentiels. Avant toute implémentation, les contradictions entre « aucune sélection d'existant » et « réutilisation des clients/véhicules extérieurs » doivent être arbitrées.

## Méthode et limites

Audit réalisé par lecture du code, des migrations et du schéma baseline. Aucune requête d'écriture, migration, reconstruction ou recette navigateur n'a été exécutée. Les comportements d'exécution non démontrables statiquement sont signalés comme risques ou questions, et non comme faits.
