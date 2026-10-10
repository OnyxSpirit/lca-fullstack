# CORR-ERP-02A — Changements

## CRM-01

Fichier : `backend-node/src/modules/crm/crm.routes.ts`

Ajouts : type `CrmStage`, constante `CRM_STAGE_TRANSITIONS`, fonction `isCrmStageTransitionAllowed` et garde dans `PATCH /api/leads/:id/stage`.

### Matrice appliquée

| Source | Destinations génériques autorisées |
|---|---|
| new | contacted, lost |
| contacted | qualified, lost |
| qualified | lost |
| appointment | lost |
| test_drive | lost |
| offer | negotiation, lost |
| negotiation | lost |
| won | aucune |
| lost | aucune |

Les 71 autres couples sur 81 sont refusés, y compris les neuf transitions identiques. `appointment`, `test_drive`, `offer` et `won` continuent d'être produits par leurs endpoints métier. Un refus intervient avant transaction, activité, notification et événement temps réel.

## RBAC-01

Fichier : `backend-node/src/modules/customers/customer.routes.ts`

- Livraison : `permissionScopePredicate(request, 'delivery.view', {agency:'d.agency_id', owner:'d.delivery_specialist_id'})`.
- Showroom : prédicat identique à la règle du module : OWN = même agence et affectataire, ou visite non affectée accueillie par l'acteur ; AGENCY, CONCESSION et GLOBAL conservés.
- GED : `documentAccessPredicate(request, 'ged.view')`, qui intersecte scope GED et permission métier de l'entité client.

Chaque prédicat est injecté dans sa sous-requête et ses paramètres sont ajoutés immédiatement après `customer_id`, dans le même ordre que les placeholders.

## Tests ajoutés

- `backend-node/test/crm-stage-transition-matrix.test.ts`
- `backend-node/test/customer-360-timeline-scope.test.ts`

Aucune migration, permission ou modification frontend.
