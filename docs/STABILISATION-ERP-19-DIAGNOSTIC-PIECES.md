# ERP-19 — Diagnostic Atelier/Pièces

Date : 2026-10-11. Phase 1, audit sans modification.

## Cause exacte de ERP18-PARTS-01

Le blocage est la combinaison de trois causes :

1. les routes de réservation et de traitement d'une réservation commencent par `serviceAccess('service.order.update')`, puis exigent une permission spécialisée `parts.reservation.*` ;
2. les rôles SAV possèdent `service.order.update` mais aucune permission de réservation Pièces ; les rôles Pièces possèdent les quatre permissions spécialisées mais aucune permission Service ;
3. le frontend enferme toute la carte « Pièces et main-d’œuvre » derrière `service.order.update`, avant de tester `parts.reservation.create` ou `parts.reservation.consume`.

Seul le Super Administrateur cumule actuellement les deux familles. Le blocage arrive donc dans le middleware général, avant les contrôles de statut, de stock et de scope spécialisés.

Une dérive historique explique cette situation : la fixture `auth-session-fixture.ts` attribue encore `service.order.update` à `PARTS_MANAGER`, alors que le provisionnement dynamique réel définit `MAGASINIER` et `RESPONSABLE_PIECES` par le préfixe `parts` uniquement. La migration 032 a pourtant créé quatre permissions minimales dédiées et les a attribuées aux rôles possédant `parts.stock.adjust`.

## Cartographie des routes

| Étape | Méthode et route | Gardes actuelles | Contrôles/transaction | Effet stock |
|---|---|---|---|---|
| Consulter pièces disponibles | `GET /repair-orders/:id/available-parts` | `service.order.view` + `parts.reservation.view` ou `create`, scope OR | OR visible, agence couverte | aucun |
| Consulter stocks locaux | `GET /repair-orders/:id/available-parts/:partId/stocks` | `service.order.view` + `parts.reservation.create`, scope OR | magasin actif de la même agence | aucun |
| Formaliser le besoin/chiffrage | `POST /repair-orders/:id/estimate-items` avec `itemType=part` | `service.order.update` + `parts.reservation.view` ou `create` | OR diagnosis/waiting_approval, quantité entière, pièce présente dans l'agence, verrou OR, idempotence facultative, aucun accord client déjà enregistré | aucun ; crée une ligne estimative |
| Supprimer le besoin avant décision | `DELETE /repair-orders/:id/estimate-items/:itemId` | `service.order.update` | statuts diagnostic/attente, chiffrage non soumis, verrou OR | aucun |
| Réserver une ligne acceptée | `POST /repair-orders/:id/estimate-items/:estimateItemId/reserve` | `service.order.update` + `parts.reservation.create`, scopes Service puis Pièces | OR `in_progress`, acceptation client, ligne part, stock magasin local, verrou OR/ligne/stock, réservation idempotente par unicité de ligne | `reserved_stock += quantité`, mouvement `reservation` |
| Réservation historique/directe | `POST /repair-orders/:id/parts/reserve` | mêmes gardes | refuse si chiffrage accepté existe, statuts diagnosis/waiting/in_progress, clé de requête, stock disponible | même effet |
| Délivrer/consommer | `PATCH /repair-orders/:id/parts/reservations/:reservationId`, statut `consumed` | `service.order.update` + `parts.reservation.consume` | réservation active, stock et agence cohérents, quantité bornée, verrous OR/réservation/stock | baisse `reserved_stock` et `current_stock`, mouvement `repair_order`, crée/agrège la ligne OR facturable |
| Annuler/libérer réservation | même route, statut `released` | `service.order.update` + `parts.reservation.release` | mêmes verrous et contrôles | baisse `reserved_stock`, stock physique inchangé, mouvement `release` |
| Consommer directement sans réservation | `POST /repair-orders/:id/items`, `itemType=part` | `service.order.update` + `parts.stock.adjust` | OR `in_progress`, stock magasin, disponibilité, clé de requête | baisse directe `current_stock`, mouvement `repair_order`, ligne facturable |
| Corriger une ligne consommée | `PATCH /repair-orders/:id/items/:itemId` | `service.order.update`; pour une pièce `parts.stock.adjust` | OR en cours, verrou ligne/stock | delta sur `current_stock`, mouvement `adjustment` |
| Annuler une ligne consommée | `DELETE /repair-orders/:id/items/:itemId` | mêmes gardes | OR en cours, ligne active, verrou stock | restitue `current_stock`, mouvement `adjustment` |
| Retour générique au magasin | `POST /parts/:id/returns` | `parts.stock.adjust`, scope Pièces | quantité entière, motif, verrou stock | augmente `current_stock`, mouvement `return`; aucun lien obligatoire à l'OR |
| Réception fournisseur | `POST /purchase-orders/:id/receipts` | `parts.purchase_order.receive` | commande/agence/statut, idempotence, lignes et stock verrouillés | augmente `current_stock`, mouvement `purchase` |
| Nettoyage abandon OR | `POST /repair-orders/:id/abandonment/finalize` | `service.order.abandon` | absence de travaux/sessions, cohérence financière, verrous OR/réservations/stocks | libère les réservations restantes |
| Facturation | `POST /repair-orders/:id/invoice` | `service.order.invoice` + deux permissions Billing | OR prêt, lignes réelles, ventilation garantie, transaction | aucun nouveau mouvement ; transforme les lignes réelles en facture |

Les contrôleurs et services transactionnels sont actuellement concentrés dans `workshop.routes.ts`; les primitives de verrouillage proviennent de `part-stock.ts`. Il n'existe pas de ressource distincte « demande de pièce » ni « bon de délivrance » : le besoin est la ligne estimative, et `consumed` représente simultanément délivrance, consommation et création de la ligne facturable.

## Workflow réel et point de blocage

1. le SAV diagnostique et crée une ligne estimative de pièce ;
2. le client accepte le chiffrage et l'OR passe en cours ;
3. un opérateur choisit un stock magasin et réserve ;
4. le même endpoint de réservation est ensuite passé à `consumed` ;
5. la transaction décrémente le physique et crée la ligne OR ;
6. la facture Atelier reprend les lignes réelles actives.

Le workflow est déjà bloqué à l'étape 1 pour les rôles SAV, faute de `parts.reservation.view/create`. Il est bloqué aux étapes 3–4 pour les rôles Pièces, faute de `service.order.update`. La consommation directe est également inutilisable hors Super Admin pour la même intersection.

## Analyse de sécurité

- ajouter `service.order.update` aux rôles Pièces ouvrirait aussi le chiffrage, les lignes de main-d’œuvre et d'autres mutations OR : privilège excessif ;
- ajouter toutes les permissions Pièces aux rôles SAV leur donnerait la garde du stock en plus de la décision Atelier : séparation affaiblie ;
- supprimer toutes les gardes Service sans reconstruire un scope OR à partir de la permission Pièces créerait un risque inter-agences ;
- `OWN` n'est pas adapté au stock collectif ; AGENCY et CONCESSION sont cohérents pour Magasinier et Responsable pièces ;
- les verrous `FOR UPDATE`, l'idempotence, les statuts OR, l'acceptation client, le magasin local et les quantités doivent être conservés.

## Conclusion technique

`service.order.update` est légitime pour créer/modifier le chiffrage et les lignes générales d'OR. Il est inutilement général pour réserver, libérer ou consommer une réservation, car les permissions spécialisées décrivent déjà exactement ces effets. La correction ne doit toutefois pas se limiter à supprimer le middleware : il faut un accès OR minimal, scopé par la permission Pièces utilisée.
