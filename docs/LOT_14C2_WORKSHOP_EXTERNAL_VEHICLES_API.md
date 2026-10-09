# Lot 14C.2 — API véhicules extérieurs Atelier

Ce lot ajoute uniquement des API backend. Il conserve les référentiels centraux
`customers` et `vehicles`, le workflow OR existant et les protections du stock.

## Permissions

Les cinq permissions sont `workshop.vehicles.view`,
`workshop.external_vehicle.create`, `workshop.vehicle.associations.create`,
`workshop.vehicle.associations.view` et `workshop.vehicle.associations.close`.
Elles ne sont attribuées automatiquement à aucun rôle. Chaque droit porte un
scope `OWN`, `AGENCY`, `CONCESSION` ou `GLOBAL`; l'accès client est aussi recoupé
avec `customers.view`. `OWN` désigne les objets créés par l'utilisateur et limite
une nouvelle création à son agence.

## Routes et contrats

Toutes les routes exigent un JWT dont la session `sid` est active.

- `GET /api/customers?search=...` reste la recherche centrale par nom, prénom,
  raison sociale ou téléphone. Elle retourne les homonymes sans les fusionner.
- `GET /api/workshop/vehicles/search` accepte `vin`, `registration`, `brand`,
  `model`, `customerId`; au moins un critère est requis. Réponse :
  `{ items: VehicleMatch[], ambiguous: boolean }`, au plus 50 résultats autorisés.
- `POST /api/workshop/external-vehicles` exige `customerId`, `agencyId` et, hors
  catalogue, `brand` + `model`. VIN, plaque, version et caractéristiques sont
  facultatifs. Réponse 201 : `{ vehicleId, associationId }`.
- `POST /api/workshop/vehicle-associations` accepte `customerId`, `vehicleId`,
  `agencyId`, `relationType` et facultativement `validFrom`, `notes`. Cette
  opération manuelle force la source `MANUAL` ; les sources techniques ne sont
  pas usurpables par le client HTTP.
- `GET /api/workshop/customers/:customerId/vehicle-associations` retourne les
  relations courantes ; `includeHistory=true` inclut les relations clôturées.
- `PATCH /api/workshop/vehicle-associations/:id/close` accepte un `validTo`
  facultatif et clôture sans suppression physique.

Le VIN est normalisé en 17 caractères valides. La plaque est comparée en
majuscules sans séparateurs usuels. Le serveur force `EXTERNAL`, `WORKSHOP` et
`is_commercial_stock=FALSE`; il n'invente ni VIN, ni plaque, ni version.

Un VIN existant retourne 409/`VIN_ALREADY_EXISTS`. Une plaque correspondante
retourne 409/`REGISTRATION_AMBIGUOUS`; `confirmRegistrationAmbiguity=true` est
requis pour poursuivre. Une collision VIN concurrente devient aussi un 409.
Véhicule et association sont écrits dans une transaction unique.

Les relations acceptent `OWNER`, `DRIVER`, `RESPONSIBLE`, `FLEET` et les sources
existantes `SALE`, `REPAIR_ORDER`, `MANUAL`, `IMPORT`. Un doublon courant renvoie
`RELATION_ALREADY_EXISTS`; un autre propriétaire courant renvoie
`CURRENT_OWNER_CONFLICT`. Aucun transfert automatique n'est effectué.

L'agence d'origine du véhicule n'est jamais modifiée. L'agence de relation est
validée séparément par le scope. Le sélecteur OR existant continue de fusionner
relations, ventes et anciens OR sans filtrer l'origine. Création de véhicule,
création et clôture de relation sont auditées sans coordonnées personnelles.
Les ventes et devis refusent toujours les véhicules hors stock commercial.

Ce lot ne fournit ni frontend, ni nouvelle fenêtre OR, ni reporting interne /
externe. Une plaque n'étant pas une identité globale, sa confirmation demeure
une décision explicite du futur frontend.
