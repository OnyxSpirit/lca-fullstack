# Backend et API

Le routeur `commercialCatalogRouter` est monté sous `/api` après authentification, scope agence et contexte RBAC (`backend-node/src/app.ts:79`). L'implémentation est concentrée dans `backend-node/src/modules/vehicles/commercial-catalog.routes.ts`; helpers images, profil technique, pagination, audit et autorisation sont réutilisés.

| Méthode | Route | Consommée ici | Permission | Effet |
|---|---|---|---|---|
| GET | `/commercial-models?availableOnly=false` | oui | catalog view ou manage | liste globale des profils/images |
| GET | `/vehicle-references` | oui | vehicles.view ou vehicles.create | versions normalisées; dépendance indirecte problématique pour un catalogueur pur |
| POST | `/commercial-models` | oui | droit central `vehicles.catalog.manage` | crée profil + audit |
| PATCH | `/commercial-models/:id` | oui | droit central manage | verrou + révision optimiste + audit |
| POST | `/commercial-models/:id/images` | oui | droit central manage | galerie, stockage atomique |
| PATCH | `/commercial-models/:id/images/:imageId/primary` | oui | manage | image principale |
| PATCH | `/commercial-models/:id/images/order` | oui | manage | ordre complet |
| DELETE | `/commercial-models/:id/images/:imageId` | oui | manage | suppression image |
| GET | `/vehicle-orders?page&pageSize` | oui | agence `vehicles.catalog.view` | commandes de l'agence, pagination |
| POST | `/vehicle-orders` | oui | agence `vehicles.catalog.manage` | commande + N véhicules + historiques + audit |
| POST | `/vehicle-orders/:id/receipts` | oui | agence manage | réception partielle/totale transactionnelle |
| GET/PATCH | `/vehicles`, `/vehicles/:id`, `/vehicles/:id/status` | section stock connexe | `vehicles.view`, `vehicles.status.update` | expose/modifie les fiches créées |
| POST | `/vehicles/:id/images` | stock connexe | `vehicles.images.manage` | photos individuelles |

Absents : GET détail commande, PATCH/annulation commande, GET véhicules par commande, GET historique des réceptions. Les données sont néanmoins accessibles indirectement par `/vehicles` sans filtre `vehicleOrderId`; la réponse véhicule ne mappe pas `vehicle_order_id`.

Transactions : `withCurrentAgencyBusinessAuthorization` couvre création et réception. Création verrouille le profil; réception verrouille commande puis véhicules `ordered`. Idempotence par `(created_by, client_request_id)` et `(received_by, client_request_id)`. Une répétition renvoie 200, mais une réception répétée renvoie `vehicleIds: []`, pas les identifiants originaux.

