# ERP-19 — Correction du workflow Atelier/Pièces

Date : 2026-10-11.

## Correction backend

Les routes de consultation du stock disponible, de réservation, de consommation et de libération utilisent désormais un garde spécialisé `partsOrderAccess`. Ce garde :

- vérifie la permission `parts.reservation.*` correspondant à l'opération ;
- charge uniquement `id`, `agency_id` et `status` de l'OR ;
- applique le scope de cette permission à l'agence de l'OR ;
- refuse `OWN` pour cette ressource de stock collective ;
- accepte `AGENCY`, `CONCESSION` et `GLOBAL` selon leur sémantique existante ;
- place le contexte minimal validé dans un `WeakMap` lié à la requête.

`service.order.update` n'est donc plus requis sur les opérations spécialisées. Il reste obligatoire sur le chiffrage, les mutations générales de l'OR et les chemins historiques de modification des lignes. Aucun rôle métier ni Super Administrateur n'est codé en dur.

Les contrôles transactionnels existants sont conservés : statuts OR, acceptation client, magasins locaux, verrous `FOR UPDATE`, disponibilité, idempotence, mouvements, réservations et création des lignes facturables. La recette MySQL Phase 3 a conduit à ajouter le retry de deadlock existant du projet aux deux transactions de réservation afin qu'une contention soit rejouée puis convertie en refus métier de stock, au lieu d'un HTTP 500.

## Correction frontend

Une surface « Opérations Pièces » est affichée lorsqu'un utilisateur possède une permission de réservation spécialisée sans `service.order.update`. Une file minimale `Pièces > Demandes Atelier` rend cette surface atteignable par un profil exclusivement Pièces. Les boutons Réserver, Consommer et Libérer sont chacun conditionnés par leur permission effective. Les utilisateurs disposant aussi de la modification générale conservent la carte existante et disposent d'une action de libération dédiée.

La création et la suppression du chiffrage restent sous `service.order.update`. Le frontend ne contient aucun test sur un nom de rôle.

## Chemins historiques

`POST /repair-orders/:id/items`, ainsi que la correction et l'annulation de lignes facturables, restent protégés par `service.order.update`. Pour une pièce, `parts.stock.adjust` et son scope restent également obligatoires. Ils ne sont pas devenus accessibles avec une simple permission de réservation.

## Fichiers de code

- `backend-node/src/modules/workshop/workshop.routes.ts`
- `frontend/src/modules/service/RepairOrderDetailPage.tsx`
- `frontend/src/modules/parts/PartsWorkQueuePage.tsx`
- `frontend/src/modules/parts/SparePartsPage.tsx`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/App.tsx`
- `backend-node/test/erp19-parts-workflow.test.ts`
- `frontend/test/erp19-parts-workflow.behavior.test.ts`
- `frontend/test/parts-rbac.test.ts`
