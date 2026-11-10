# Phase 2C-1 — Inventaire RBAC

Date de l'audit : 10 novembre 2026. Source : dépôt courant et MySQL local `concession_erp` 8.4.11, interrogé exclusivement par `SELECT`. Aucun chiffre n'est déduit des seeds.

## Synthèse vérifiée

| Objet | Total | Actif | Inactif |
|---|---:|---:|---:|
| Permissions | 331 | 331 | 0 |
| Rôles | 17 | 17 | 0 |
| Associations rôle-permission | 820 | — | — |
| Affectations historiques `user_roles` | 19 | — | — |
| Affectations `user_agencies` | 19 | — | — |
| Affectations `user_agency_roles` | 18 | — | — |

Il n'existe ni code de permission dupliqué, ni permission sans rôle. Toutes les permissions sont actives. Trois permissions n'ont aucun littéral exact dans `backend-node/src`, `backend-node/test` ou `frontend/src` : `crm.offer.prepare`, `service.order.correct`, `service.reporting.export`. Elles sont classées « non référencées statiquement », pas supprimables : un appel indirect ou futur reste possible. Le croisement naïf des chaînes produit de nombreux faux positifs (clés d'événement, paramètres, noms de fichiers) ; seuls les appels de contrôle et les types de permission ont été retenus comme preuves d'usage.

## Répartition effective des scopes

| Scope | Associations | Permissions distinctes | Rôles distincts | Destination 2C-2 |
|---|---:|---:|---:|---|
| `OWN` | 52 | 27 | 4 | Conserver ; formaliser le propriétaire par ressource |
| `AGENCY` | 414 | 304 | 15 | Scope métier cible |
| `CONCESSION` | 17 | 17 | 2 | Reclassifier A/B/C/D, jamais remplacer mécaniquement |
| `GLOBAL` | 337 | 329 | 3 | 329 SUPER_ADMIN ; 8 autres à reclassifier en central ou local |

La colonne reste `role_permissions.scope ENUM('OWN','AGENCY','CONCESSION','GLOBAL')`. Les types TypeScript historiques sont encore présents dans `src/types/index.ts`, le middleware `require-permission.ts`, `permission-scope-policy.ts`, `scope-intersection.ts`, de nombreux services métier et les contrats frontend.

## Rôles

| ID | Code | Système | Permissions | Utilisateurs historiques | Affectations agence | Scopes | Risque |
|---:|---|:---:|---:|---:|---:|---|---|
| 1 | `SUPER_ADMIN` | oui | 331 | 1 | 0 | OWN(2), GLOBAL(329) | critique : conserver le bypass central explicite, sans affectation artificielle |
| 2 | `CHARG_TEST` | non | 330 | 1 | 1 | OWN(4), AGENCY(303), CONCESSION(16), GLOBAL(7) | critique : rôle de recette quasi omnipotent, principale dette historique |
| 3 | `COMPT_90` | non | 22 | 0 | 0 | AGENCY | faible, mais rôle sans utilisateur |
| 4 | `REC02_PROVIDER` | non | 17 | 1 | 1 | AGENCY | moyen, prestataires/finance |
| 5 | `REC02_REQUESTER` | non | 6 | 1 | 1 | AGENCY | moyen |
| 6 | `REC02_APPROVER` | non | 8 | 1 | 1 | AGENCY | élevé, séparation des tâches |
| 7 | `REC02_FINANCE` | non | 10 | 1 | 1 | AGENCY | élevé, création de dépense |
| 8 | `REC02_TREASURER` | non | 7 | 1 | 1 | AGENCY | élevé, décaissement |
| 9 | `REC02_NOPERM` | non | 0 | 1 | 1 | — | attendu pour tests négatifs |
| 10 | `REC02_SCOPE_AGENCY` | non | 2 | 2 | 2 | AGENCY | rôle de recette |
| 11 | `REC02_SCOPE_CONCESSION` | non | 2 | 2 | 2 | AGENCY, CONCESSION | rôle de recette à retirer après convergence |
| 12 | `REC02_SCOPE_GLOBAL` | non | 2 | 2 | 2 | AGENCY, GLOBAL | rôle de recette à retirer après convergence |
| 13 | `COMMERCIAL_MET01` | non | 29 | 1 | 1 | OWN(23), AGENCY(6) | propriété commerciale à préserver |
| 14 | `MET01_QUOTE_VALIDATOR` | non | 2 | 1 | 1 | AGENCY | validation devis |
| 15 | `COMMERCIAL_RECETTE` | non | 29 | 1 | 1 | OWN(23), AGENCY(6) | propriété commerciale à préserver |
| 16 | `FINANCIER_RECETTE` | non | 17 | 1 | 1 | AGENCY | finance locale |
| 17 | `VALIDATEUR_COMMERCIAL_RECETTE` | non | 6 | 1 | 1 | AGENCY | validation commerciale |

Toutes les permissions liées sont actives. `SUPER_ADMIN` est l'unique rôle système ; sa résolution dans `agency-rbac.service.ts` est centrale et ne dépend pas de `user_agency_roles`. Il possède néanmoins deux permissions personnelles 2FA en `OWN`, ce qui est cohérent avec l'auto-administration.

## Attributions historiques hors SUPER_ADMIN

`CONCESSION` sur `CHARG_TEST` : `crm.prospect.assign`, `customers.assign`, `delivery.checklist.config.manage`, `delivery.checklist.config.view`, `delivery.checklist.manage`, `delivery.checklist.view`, `hr.budget.category.manage`, `hr.leave.type.manage`, `hr.stock.manage`, `showroom.assign`, `stamp.manage`, `stamp.use`, `stamp.view`, `vehicles.assignments.manage`, `vehicles.assignments.view`, `vehicles.view`.

`CONCESSION` de recette : `hr.providers.view` sur `REC02_SCOPE_CONCESSION`.

`GLOBAL` sur `CHARG_TEST` : `auth.2fa.policy.manage`, `auth.2fa.settings.manage`, `auth.2fa.settings.view`, `vehicles.archive`, `vehicles.assign_agency`, `vehicles.status.update`, `vehicles.update`.

`GLOBAL` de recette : `hr.providers.view` sur `REC02_SCOPE_GLOBAL`.

Les permissions 2FA globales sont catégorie B. `vehicles.assign_agency` est catégorie C. Les opérations véhicule restantes sont locales A sauf si le besoin fonctionnel exige une console centrale explicite. `hr.providers.view` des rôles REC02 est uniquement une sonde de recette. Les référentiels/checklists/cachets sont B si communs, sinon A avec surcharge agence. Les affectations prospect/client/showroom sont A dans l'agence active ; toute réaffectation entre agences devient C.

## Inventaire exhaustif par module MySQL

| Module | Nombre | Codes |
|---|---:|---|
| activity | 1 | `activity.view` |
| auth | 11 | `auth.2fa.devices.delete`, `auth.2fa.devices.revoke`, `auth.2fa.devices.view`, `auth.2fa.manage`, `auth.2fa.policy.manage`, `auth.2fa.settings.manage`, `auth.2fa.settings.view`, `auth.2fa.users.enforce`, `auth.2fa.users.reset`, `auth.2fa.users.view`, `auth.2fa.view` |
| bank_reconciliation | 6 | `treasury.reconciliation.cancel`, `export`, `import`, `reconcile`, `validate_import`, `view` |
| billing | 10 | `billing.export`, `billing.invoice.cancel/create/issue/update/view`, `billing.payment.collect/refund/view`, `billing.view` |
| crm | 12 | `crm.activity.create/view`, `crm.appointment.create/override_conflict`, `crm.offer.prepare`, `crm.pipeline.advance`, `crm.prospect.assign/create/lose/update/view`, `crm.test_drive.create` |
| customers | 5 | `customers.assign/create/history.view/update/view` |
| dashboard | 1 | `dashboard.view` |
| delivery | 15 | `delivery.cancel`, `checklist.config.manage/view`, `checklist.manage/view`, `complete`, `documents.view`, `financial_override.authorize`, `prepare`, `schedule`, `service.add/manage/view`, `signature.capture`, `view` |
| documents | 9 | `document.signature.apply`, `ged.archive/upload/view`, `signature.manage.self/view.self`, `stamp.manage/use/view` |
| hr | 60 | Familles `approval.history`, `bonus`, `budget`, `contract`, `employee.account`, `employees`, `expense`, `leave`, `provider`, `remuneration`, `reporting`, `salary`, `stock`, plus `hr.view`; définitions exactes dans les migrations 043, 058, 063–065, 073–074 et 108 |
| notifications | 4 | `notifications.archive/delete/update/view` |
| parts | 35 | Familles `catalog`, `direct_purchase`, `internal_delivery`, `internal_request`, `inventory`, `purchase_order`, `reporting`, `reservation`, `return`, `sale`, `stock`, `suppliers`, plus `parts.view` |
| proformas | 5 | `proformas.create/export/issue/update/view` |
| quotations | 7 | `quotations.cancel/convert/create/discount.manage/update/validate/view` |
| reporting | 2 | `reporting.export/view` |
| roles | 6 | `roles.create/delete/disable/permissions.manage/update/view` |
| sales | 8 | `sales.assign/cancel/confirm/create/discount.manage/tax.override/update/view` |
| service | 37 | Familles `billing`, `documents`, `estimate.supplement`, `journal`, `labor`, `order`, `parts`, `reporting`, `tax`, `transit`, `warranty` |
| settings | 14 | Familles `agencies`, `documents`, `general`, `manufacturers`, `workshop_rates`, plus `settings.update/view` |
| showroom | 5 | `showroom.assign/status.update/view/visitor.create/visitor.update` |
| supplier_finance | 11 | `supplier.credit.create/validate`, `debt.view`, `invoice.create/history.view/reject/submit/update/validate/view`, `payment.create` |
| treasury | 16 | Familles `account`, `category`, `coverage`, `disbursement`, `receipt`, `reservation`, `reverse`, `transfer`, plus `treasury.view` |
| users | 7 | `users.assign_agency/assign_role/create/disable/reset_password/update/view` |
| vehicles | 18 | `vehicle.return.*` (6), `vehicles.archive/assign_agency/assignments.manage/assignments.view/catalog.manage/catalog.view/create/financials.view/images.manage/status.update/update/view` |
| workshop | 26 | Familles `assign`, `bay`, `external_vehicle`, `intervention`, `plan`, `productivity`, `resources`, `schedule`, `session`, `technicians`, `time`, `vehicle.associations`, `vehicles`, plus `workshop.view` |

Le total de cette table est 331. Les colonnes `id`, `code`, `module`, `action`, `label`, `description`, `is_active`, les rôles et scopes ont été contrôlés pour chaque ligne par jointure `permissions → role_permissions → roles`.

## Interpréteurs et dette structurelle

- `require-permission.ts` charge encore le contexte historique issu de `user_roles` et `users.agency_id`.
- `permission-scope-policy.ts` et les fonctions locales de routes rangent les scopes et produisent des fragments SQL différents.
- La nouvelle chaîne `agency-authorization.ts` / `agency-rbac.service.ts` fusionne les rôles de l'agence active et protège la fraîcheur du contexte, mais les endpoints métier ne l'utilisent pas encore.
- `database-bootstrap.ts` et `admin-provisioning.ts` attribuent encore `GLOBAL` au SUPER_ADMIN.
- 55 fichiers backend ont une dépendance textuelle à `users.agency_id`, `request.user.agencyId` ou équivalent ; ce champ historique ne peut donc pas être retiré en 2C-2.
- 727 déclarations de méthodes HTTP ont été recensées dans 47 fichiers `*.routes.ts`; 226 permissions sont visibles directement dans des appels de garde, le solde passant par types, wrappers ou services.

## Anomalies de nomenclature

Les modules MySQL ne suivent pas toujours le préfixe du code (`bank_reconciliation` contient `treasury.reconciliation.*`, `documents` contient `ged`, `signature`, `stamp`; `vehicles` contient `vehicle.return.*`). Les actions sont parfois génériques (`update`) pour des opérations métier spécifiques. Ce n'est pas une faille, mais cela complique l'automatisation et doit être normalisé seulement après gel d'un catalogue de compatibilité.

## Reproductibilité

Les statistiques proviennent de `COUNT(*)`, `SUM(is_active=...)`, `COUNT(DISTINCT ...)` et `GROUP BY scope` sur les six tables RBAC. La cartographie de code a utilisé `rg` et une extraction des littéraux passés aux gardes. Aucun `INSERT`, `UPDATE`, `DELETE`, DDL ou test modifiant MySQL n'a été exécuté.
