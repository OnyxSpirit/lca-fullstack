# Inventaire final des endpoints RBAC

Généré le 10 novembre 2026 depuis l'AST TypeScript des fichiers `*.routes.ts`. Cette référence compte les appels HTTP portés par un routeur Express ; elle exclut les appels homonymes `.get()` sur les maps de permissions qui avaient gonflé le comptage historique à 727.

## Synthèse initiale

- Déclarations HTTP réelles : **663**.
- Fichiers de routes : **47**.
- Les statuts automatiques sont volontairement conservateurs. Seul « Migré » correspond à un garde métier/central du nouveau socle ; la validation finale exige encore l'audit du service, du SQL, des transactions, de Socket.IO et des tests.
- Les colonnes ressource, agence réelle, propriétaire, transaction, événements et tests sont renseignées dans la matrice d'autorisations au fur et à mesure de la validation des groupes ; elles ne sont jamais déduites du seul nom de route.

| Statut initial | Nombre |
|---|---:|
| Conservé à auditer | 14 |
| Hors scope métier | 7 |
| Migré | 106 |
| Socle validé | 3 |
| À auditer | 533 |

## Inventaire route par route

| # | Méthode | Route | Module | Permission visible | Classe initiale | Statut | Déclaration |
|---:|---|---|---|---|---|---|---|
| 1 | GET | `/activity/filters` | activity | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/activity/activity.routes.ts#L38) |
| 2 | GET | `/activity/print/pdf` | activity | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/activity/activity.routes.ts#L74) |
| 3 | GET | `/activity/:id/print/pdf` | activity | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/activity/activity.routes.ts#L81) |
| 4 | GET | `/activity/:id` | activity | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/activity/activity.routes.ts#L85) |
| 5 | GET | `/activity` | activity | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/activity/activity.routes.ts#L87) |
| 6 | POST | `/login` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L28) |
| 7 | POST | `/2fa/verify` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L29) |
| 8 | POST | `/2fa/recovery` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L30) |
| 9 | POST | `/2fa/challenge/setup` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L31) |
| 10 | POST | `/2fa/challenge/confirm` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L32) |
| 11 | POST | `/2fa/step-up` | auth | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/auth.routes.ts#L33) |
| 12 | GET | `/2fa/status` | auth | `auth.2fa.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/auth.routes.ts#L34) |
| 13 | POST | `/2fa/setup` | auth | `auth.2fa.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/auth.routes.ts#L35) |
| 14 | POST | `/2fa/confirm` | auth | `auth.2fa.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/auth.routes.ts#L36) |
| 15 | POST | `/2fa/disable` | auth | `auth.2fa.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/auth.routes.ts#L37) |
| 16 | POST | `/2fa/recovery/regenerate` | auth | `auth.2fa.manage` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L38) |
| 17 | POST | `/refresh` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L39) |
| 18 | GET | `/me` | auth | `—` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/auth/auth.routes.ts#L40) |
| 19 | POST | `/logout` | auth | `—` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/auth/auth.routes.ts#L41) |
| 20 | GET | `/auth/2fa/users/:id` | auth | `auth.2fa.users.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L11) |
| 21 | PATCH | `/auth/2fa/users/:id/requirement` | auth | `auth.2fa.users.enforce` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L12) |
| 22 | POST | `/auth/2fa/users/:id/reset` | auth | `auth.2fa.users.reset` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L13) |
| 23 | GET | `/auth/2fa/role-policies` | auth | `auth.2fa.policy.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L14) |
| 24 | PUT | `/auth/2fa/role-policies/:id` | auth | `auth.2fa.policy.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L15) |
| 25 | GET | `/auth/2fa/security-settings` | auth | `auth.2fa.settings.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L16) |
| 26 | PUT | `/auth/2fa/security-settings` | auth | `auth.2fa.settings.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L17) |
| 27 | GET | `/auth/2fa/security-center/overview` | auth | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L18) |
| 28 | GET | `/auth/2fa/security-center/users` | auth | `auth.2fa.users.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L19) |
| 29 | GET | `/auth/2fa/devices/me` | auth | `auth.2fa.view` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L20) |
| 30 | DELETE | `/auth/2fa/devices/me/current` | auth | `auth.2fa.view` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L21) |
| 31 | DELETE | `/auth/2fa/devices/me/:id` | auth | `auth.2fa.view` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L22) |
| 32 | GET | `/auth/2fa/devices` | auth | `auth.2fa.devices.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L23) |
| 33 | DELETE | `/auth/2fa/devices/:id/permanent` | auth | `auth.2fa.devices.delete` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L24) |
| 34 | DELETE | `/auth/2fa/devices/:id` | auth | `auth.2fa.devices.revoke` | Métier à migrer | À auditer | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L25) |
| 35 | GET | `/invoices/payment-methods` | billing | `billing.payment.collect` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L53) |
| 36 | GET | `/billing/config` | billing | `billing.invoice.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L54) |
| 37 | GET | `/invoices/export/accounting` | billing | `billing.export` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L55) |
| 38 | GET | `/invoices` | billing | `billing.invoice.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L64) |
| 39 | GET | `/invoices/:id` | billing | `billing.invoice.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L80) |
| 40 | POST | `/invoices` | billing | `billing.invoice.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L88) |
| 41 | POST | `/invoices` | billing | `billing.invoice.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L89) |
| 42 | PATCH | `/invoices/:id` | billing | `billing.invoice.update` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L90) |
| 43 | PATCH | `/invoices/:id/status` | billing | `billing.invoice.issue` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L91) |
| 44 | POST | `/invoices/:id/cancel` | billing | `billing.invoice.cancel` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L92) |
| 45 | GET | `/invoices/:id/payments` | billing | `billing.payment.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L94) |
| 46 | POST | `/invoices/:id/archive` | billing | `billing.invoice.issue` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L104) |
| 47 | POST | `/payments/:id/receipt/archive` | billing | `billing.payment.collect` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L106) |
| 48 | POST | `/invoices/:id/payments` | billing | `billing.payment.collect` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L107) |
| 49 | GET | `/invoices/:id/credit-notes` | billing | `billing.payment.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L108) |
| 50 | POST | `/invoices/:id/credit-notes` | billing | `billing.invoice.cancel` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L109) |
| 51 | POST | `/credit-notes/:id/archive` | billing | `billing.invoice.cancel` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L111) |
| 52 | POST | `/payments/:id/refund` | billing | `billing.payment.refund` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L112) |
| 53 | GET | `/invoices/:id/pdf` | billing | `billing.invoice.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L114) |
| 54 | GET | `/payments/:id/receipt` | billing | `billing.payment.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L115) |
| 55 | GET | `/credit-notes/:id/pdf` | billing | `billing.invoice.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/billing/billing.routes.ts#L116) |
| 56 | GET | `/documents/business/sale/:id/pdf` | core | `sales.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/core/core.routes.ts#L10) |
| 57 | GET | `/crm/team-members` | crm | `crm.prospect.assign` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L58) |
| 58 | GET | `/leads/duplicates` | crm | `crm.prospect.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L60) |
| 59 | GET | `/leads` | crm | `crm.prospect.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L67) |
| 60 | GET | `/leads/:id` | crm | `crm.prospect.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L75) |
| 61 | POST | `/leads` | crm | `crm.prospect.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L77) |
| 62 | PATCH | `/leads/:id` | crm | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/crm/crm.routes.ts#L86) |
| 63 | PATCH | `/leads/:id/stage` | crm | `crm.pipeline.advance` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L97) |
| 64 | POST | `/leads/:id/appointments` | crm | `crm.appointment.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L112) |
| 65 | PATCH | `/leads/:id/appointments/:appointmentId` | crm | `crm.prospect.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L123) |
| 66 | POST | `/leads/:id/appointments/:appointmentId/cancel` | crm | `crm.prospect.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L131) |
| 67 | GET | `/leads/:id/activities` | crm | `crm.activity.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L137) |
| 68 | POST | `/activities` | crm | `crm.activity.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L139) |
| 69 | GET | `/customers/duplicates` | customers | `customers.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L69) |
| 70 | GET | `/customers` | customers | `customers.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L70) |
| 71 | GET | `/customers/:id` | customers | `customers.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L84) |
| 72 | POST | `/customers` | customers | `customers.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L86) |
| 73 | PATCH | `/customers/:id` | customers | `customers.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L115) |
| 74 | GET | `/customers/:id/contacts` | customers | `customers.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L137) |
| 75 | POST | `/customers/:id/contacts` | customers | `customers.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L138) |
| 76 | PATCH | `/customers/:id/contacts/:contactId` | customers | `customers.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L139) |
| 77 | DELETE | `/customers/:id/contacts/:contactId` | customers | `customers.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L140) |
| 78 | GET | `/customers/:id/360` | customers | `customers.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/customers/customer.routes.ts#L142) |
| 79 | GET | `/dashboard/overview` | dashboard | `dashboard.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/dashboard/dashboard.routes.ts#L20) |
| 80 | GET | `/global-search` | dashboard | `dashboard.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/dashboard/dashboard.routes.ts#L40) |
| 81 | GET | `/delivery-checklist-config` | deliveries | `delivery.checklist.config.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L33) |
| 82 | POST | `/delivery-checklist-config/categories` | deliveries | `delivery.checklist.config.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L40) |
| 83 | PATCH | `/delivery-checklist-config/categories/:id` | deliveries | `delivery.checklist.config.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L44) |
| 84 | PATCH | `/delivery-checklist-config/categories/:id/status` | deliveries | `delivery.checklist.config.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L45) |
| 85 | POST | `/delivery-checklist-config/categories/reorder` | deliveries | `delivery.checklist.config.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L47) |
| 86 | POST | `/delivery-checklist-config/categories/:categoryId/items` | deliveries | `delivery.checklist.config.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L49) |
| 87 | PATCH | `/delivery-checklist-config/items/:id` | deliveries | `delivery.checklist.config.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L50) |
| 88 | PATCH | `/delivery-checklist-config/items/:id/status` | deliveries | `delivery.checklist.config.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L51) |
| 89 | POST | `/delivery-checklist-config/categories/:categoryId/items/reorder` | deliveries | `delivery.checklist.config.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L52) |
| 90 | GET | `/delivery-services/catalog` | deliveries | `delivery.service.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L24) |
| 91 | POST | `/delivery-services/catalog` | deliveries | `delivery.service.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L26) |
| 92 | PATCH | `/delivery-services/catalog/:id` | deliveries | `delivery.service.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L28) |
| 93 | PATCH | `/delivery-services/catalog/:id/status` | deliveries | `delivery.service.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L30) |
| 94 | GET | `/deliveries/:id/services` | deliveries | `delivery.service.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L32) |
| 95 | POST | `/deliveries/:id/services` | deliveries | `delivery.service.add` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L34) |
| 96 | GET | `/deliveries` | deliveries | `delivery.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L140) |
| 97 | GET | `/deliveries/stats` | deliveries | `delivery.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L216) |
| 98 | GET | `/deliveries/candidates` | deliveries | `delivery.schedule` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L234) |
| 99 | GET | `/deliveries/candidates/:saleId/specialists` | deliveries | `delivery.schedule` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L240) |
| 100 | GET | `/delivery/financial-authorizations/:saleId` | deliveries | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L253) |
| 101 | POST | `/delivery/financial-authorizations` | deliveries | `delivery.financial_override.authorize` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L261) |
| 102 | POST | `/delivery/financial-authorizations/:authorizationId/revoke` | deliveries | `delivery.financial_override.authorize` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L289) |
| 103 | GET | `/deliveries/:id/checklist-applicable-categories` | deliveries | `delivery.prepare` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L304) |
| 104 | GET | `/deliveries/:id` | deliveries | `delivery.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L314) |
| 105 | POST | `/deliveries` | deliveries | `delivery.schedule` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L329) |
| 106 | PATCH | `/deliveries/:id/status` | deliveries | `delivery.prepare` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L409) |
| 107 | PATCH | `/deliveries/:id/cancel` | deliveries | `delivery.cancel` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L475) |
| 108 | PATCH | `/deliveries/:id/reschedule` | deliveries | `delivery.schedule` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L496) |
| 109 | PATCH | `/deliveries/:id/checklist/:itemId` | deliveries | `delivery.checklist.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L535) |
| 110 | POST | `/deliveries/:id/documents` | deliveries | `delivery.checklist.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L569) |
| 111 | PATCH | `/deliveries/:id/documents/:documentId` | deliveries | `delivery.checklist.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L615) |
| 112 | GET | `/deliveries/:id/documents/:documentId/download` | deliveries | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L634) |
| 113 | POST | `/deliveries/:id/sign` | deliveries | `delivery.signature.capture, delivery.complete` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L652) |
| 114 | GET | `/deliveries/:id/pdf` | deliveries | `delivery.view, delivery.documents.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L725) |
| 115 | GET | `/deliveries-planning/pdf` | deliveries | `delivery.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L741) |
| 116 | GET | `/document-marks/signature/me` | document-marks | `signature.view.self` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L67) |
| 117 | POST | `/document-marks/signature/me` | document-marks | `signature.manage.self` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L69) |
| 118 | DELETE | `/document-marks/signature/me` | document-marks | `signature.manage.self` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L80) |
| 119 | GET | `/document-marks/signature/me/:id/image` | document-marks | `signature.view.self` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L86) |
| 120 | GET | `/document-marks/stamps` | document-marks | `stamp.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L94) |
| 121 | POST | `/document-marks/stamps` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L109) |
| 122 | POST | `/document-marks/stamps/:id/version` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L121) |
| 123 | PATCH | `/document-marks/stamps/:id/document-types` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L132) |
| 124 | GET | `/document-marks/stamps/:id/versions` | document-marks | `stamp.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L142) |
| 125 | PATCH | `/document-marks/stamps/:id/status` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L146) |
| 126 | GET | `/document-marks/stamps/:stampId/versions/:versionId/image` | document-marks | `stamp.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L154) |
| 127 | GET | `/document-marks/types` | document-marks | `stamp.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L159) |
| 128 | GET | `/document-marks/categories` | document-marks | `stamp.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L161) |
| 129 | POST | `/document-marks/categories` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L168) |
| 130 | PATCH | `/document-marks/categories/:id` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L174) |
| 131 | GET | `/document-marks/policies` | document-marks | `stamp.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L182) |
| 132 | PUT | `/document-marks/policies/:documentType` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L185) |
| 133 | GET | `/roles/:roleId/stamps` | document-marks | `stamp.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L198) |
| 134 | PUT | `/roles/:roleId/stamps` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L201) |
| 135 | POST | `/document-marks/stamps/:id/version` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts#L38) |
| 136 | PATCH | `/document-marks/stamps/:id/status` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts#L44) |
| 137 | POST | `/document-marks/stamps/:id/revoke` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts#L52) |
| 138 | DELETE | `/document-marks/stamps/:id` | document-marks | `stamp.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts#L73) |
| 139 | GET | `/documents/references` | documents | `ged.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L11) |
| 140 | GET | `/documents/entities/search` | documents | `ged.upload` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L12) |
| 141 | GET | `/documents/entity/:entityType/:entityId` | documents | `ged.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L13) |
| 142 | GET | `/documents` | documents | `ged.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L14) |
| 143 | GET | `/documents/:id` | documents | `ged.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L15) |
| 144 | POST | `/documents` | documents | `ged.upload` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L16) |
| 145 | GET | `/documents/:id/preview` | documents | `ged.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L19) |
| 146 | GET | `/documents/:id/download` | documents | `ged.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L20) |
| 147 | DELETE | `/documents/:id` | documents | `ged.archive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L21) |
| 148 | POST | `/documents/:id/restore` | documents | `ged.archive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L22) |
| 149 | POST | `/documents/:id/version` | documents | `ged.upload` | Métier à migrer | À auditer | [source](../backend-node/src/modules/documents/document.routes.ts#L23) |
| 150 | GET | `/hr/bonus-types` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L8) |
| 151 | POST | `/hr/bonus-types` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L9) |
| 152 | PATCH | `/hr/bonus-types/:id` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L10) |
| 153 | GET | `/hr/employees/:employeeId/bonuses` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L11) |
| 154 | GET | `/hr/bonuses/:id` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L11) |
| 155 | GET | `/hr/bonuses` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L12) |
| 156 | POST | `/hr/employees/:employeeId/bonuses` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L14) |
| 157 | PATCH | `/hr/bonuses/:id` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L15) |
| 158 | POST | `/hr/bonuses/:id/submit` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L16) |
| 159 | POST | `/hr/bonuses/:id/approve` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L17) |
| 160 | POST | `/hr/bonuses/:id/reject` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L17) |
| 161 | POST | `/hr/bonuses/:id/cancel` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L18) |
| 162 | GET | `/hr/contract-types` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L32) |
| 163 | POST | `/hr/contract-types` | hr | `hr.contract.type.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L33) |
| 164 | PATCH | `/hr/contract-types/:id` | hr | `hr.contract.type.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L34) |
| 165 | GET | `/hr/employees/:employeeId/contracts` | hr | `hr.contract.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L36) |
| 166 | GET | `/hr/contracts/:id` | hr | `hr.contract.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L37) |
| 167 | POST | `/hr/employees/:employeeId/contracts` | hr | `hr.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L38) |
| 168 | PATCH | `/hr/contracts/:id` | hr | `hr.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L39) |
| 169 | POST | `/hr/contracts/:id/activate` | hr | `hr.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L40) |
| 170 | POST | `/hr/contracts/:id/end` | hr | `hr.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L41) |
| 171 | POST | `/hr/contracts/:id/cancel` | hr | `hr.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L42) |
| 172 | POST | `/hr/contracts/:id/renew` | hr | `hr.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L43) |
| 173 | GET | `/hr/leave-types` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L12) |
| 174 | POST | `/hr/leave-types` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L13) |
| 175 | PATCH | `/hr/leave-types/:id` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L14) |
| 176 | GET | `/hr/employees/:employeeId/leaves` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L16) |
| 177 | GET | `/hr/leaves` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L17) |
| 178 | POST | `/hr/employees/:employeeId/leaves` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L19) |
| 179 | PATCH | `/hr/leaves/:id` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L20) |
| 180 | POST | `/hr/leaves/:id/submit` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L21) |
| 181 | POST | `/hr/leaves/:id/approve` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L23) |
| 182 | POST | `/hr/leaves/:id/reject` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L23) |
| 183 | POST | `/hr/leaves/:id/cancel` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L24) |
| 184 | GET | `/hr/providers/:providerId/contracts` | hr | `hr.provider.contract.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L33) |
| 185 | GET | `/hr/provider-contracts/:id` | hr | `hr.provider.contract.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L34) |
| 186 | GET | `/hr/provider-contracts/:id/history` | hr | `hr.provider.contract.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L35) |
| 187 | POST | `/hr/providers/:providerId/contracts` | hr | `hr.provider.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L37) |
| 188 | PATCH | `/hr/provider-contracts/:id` | hr | `hr.provider.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L39) |
| 189 | PUT | `/hr/provider-contracts/:id/requirements` | hr | `hr.provider.contract.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L43) |
| 190 | GET | `/hr/provider-remunerations` | hr | `hr.provider.remuneration.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L13) |
| 191 | GET | `/hr/provider-remunerations/contracts` | hr | `hr.provider.remuneration.prepare` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L14) |
| 192 | GET | `/hr/provider-remunerations/:id/history` | hr | `hr.provider.remuneration.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L15) |
| 193 | POST | `/hr/provider-remunerations` | hr | `hr.provider.remuneration.prepare` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L17) |
| 194 | POST | `/hr/provider-remunerations/:id/submit` | hr | `hr.provider.remuneration.submit` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L19) |
| 195 | POST | `/hr/provider-remunerations/:id/validate` | hr | `hr.provider.remuneration.validate` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L21) |
| 196 | POST | `/hr/provider-remunerations/:id/reject` | hr | `hr.provider.remuneration.validate` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L22) |
| 197 | POST | `/hr/provider-remunerations/:id/cancel` | hr | `hr.provider.remuneration.prepare` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L23) |
| 198 | GET | `/hr/providers/:providerId/payment-instruments` | hr | `hr.provider.remuneration.disburse` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L25) |
| 199 | POST | `/hr/providers/:providerId/payment-instruments` | hr | `hr.provider.payment_method.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L26) |
| 200 | POST | `/hr/provider-remunerations/:id/finance-request` | hr | `hr.provider.remuneration.finance.request` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L29) |
| 201 | POST | `/hr/provider-remunerations/:id/disburse` | hr | `hr.provider.remuneration.disburse` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L31) |
| 202 | POST | `/hr/provider-remunerations/:id/document-exceptions` | hr | `hr.provider.remuneration.finance.request` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L33) |
| 203 | POST | `/hr/provider-remunerations/:id/document-exceptions/:typeId/approve` | hr | `hr.provider.document_exception.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L34) |
| 204 | POST | `/hr/provider-remunerations/:id/document-exceptions/:typeId/reject` | hr | `hr.provider.document_exception.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L35) |
| 205 | GET | `/hr/personnel` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L27) |
| 206 | GET | `/hr/provider-identities/matches` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L29) |
| 207 | POST | `/hr/providers` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L31) |
| 208 | GET | `/hr/providers/:id` | hr | `hr.providers.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L33) |
| 209 | PATCH | `/hr/providers/:id` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L34) |
| 210 | POST | `/hr/providers/:id/suspend` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L35) |
| 211 | POST | `/hr/providers/:id/reactivate` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L36) |
| 212 | GET | `/hr/providers/:id/assignments` | hr | `hr.providers.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L37) |
| 213 | POST | `/hr/providers/:id/assignments` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L38) |
| 214 | POST | `/hr/providers/:id/assignments/:assignmentId/suspend` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L40) |
| 215 | POST | `/hr/providers/:id/assignments/:assignmentId/reactivate` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L41) |
| 216 | GET | `/hr/providers/:id/media` | hr | `hr.providers.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L42) |
| 217 | POST | `/hr/providers/:id/media` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L43) |
| 218 | DELETE | `/hr/providers/:id/media` | hr | `hr.providers.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L44) |
| 219 | GET | `/hr/remunerations` | hr | `hr.remuneration.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L13) |
| 220 | GET | `/hr/remunerations/agencies/options` | hr | `hr.remuneration.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L14) |
| 221 | GET | `/hr/remunerations/:id/history` | hr | `hr.remuneration.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L15) |
| 222 | GET | `/hr/remunerations/:id/compatible-budgets` | hr | `hr.remuneration.engage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L16) |
| 223 | POST | `/hr/remunerations/prepare` | hr | `hr.remuneration.prepare` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L17) |
| 224 | PATCH | `/hr/remunerations/:id` | hr | `hr.remuneration.prepare` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L18) |
| 225 | POST | `/hr/remunerations/:id/submit` | hr | `hr.remuneration.submit` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L19) |
| 226 | POST | `/hr/remunerations/:id/validate` | hr | `hr.remuneration.validate` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L21) |
| 227 | POST | `/hr/remunerations/:id/reject` | hr | `hr.remuneration.validate` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L21) |
| 228 | POST | `/hr/remunerations/:id/engage` | hr | `hr.remuneration.engage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L22) |
| 229 | POST | `/hr/remunerations/:id/payments` | hr | `hr.remuneration.pay` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L23) |
| 230 | GET | `/hr/employees` | hr | `hr.employees.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L385) |
| 231 | POST | `/hr/employees` | hr | `hr.employees.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L460) |
| 232 | GET | `/hr/employees/eligible-users` | hr | `hr.employee.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L531) |
| 233 | GET | `/hr/employees/:id` | hr | `hr.employees.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L561) |
| 234 | GET | `/hr/employees/:id/photo` | hr | `hr.employees.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L571) |
| 235 | POST | `/hr/employees/:id/photo` | hr | `hr.employees.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L584) |
| 236 | DELETE | `/hr/employees/:id/photo` | hr | `hr.employees.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L609) |
| 237 | GET | `/hr/employees/:id/pdf` | hr | `hr.employees.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L626) |
| 238 | POST | `/hr/employees/:id/link-user` | hr | `hr.employee.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L679) |
| 239 | POST | `/hr/employees/:id/unlink-user` | hr | `hr.employee.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L735) |
| 240 | PATCH | `/hr/employees/:id` | hr | `hr.employees.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L766) |
| 241 | GET | `/hr/employees/:id/salaries` | hr | `hr.salary.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L830) |
| 242 | POST | `/hr/employees/:id/salaries` | hr | `hr.salary.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L845) |
| 243 | GET | `/hr/stock-agencies` | hr | `hr.stock.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L880) |
| 244 | GET | `/hr/stock-concessions` | hr | `hr.stock.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L899) |
| 245 | GET | `/hr/internal-stock-categories` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L916) |
| 246 | POST | `/hr/internal-stock-categories` | hr | `hr.stock.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L951) |
| 247 | PATCH | `/hr/internal-stock-categories/:id` | hr | `hr.stock.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L988) |
| 248 | GET | `/hr/internal-stock` | hr | `hr.stock.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1047) |
| 249 | POST | `/hr/internal-stock` | hr | `hr.stock.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1084) |
| 250 | PATCH | `/hr/internal-stock/:id/minimum-threshold` | hr | `hr.stock.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1133) |
| 251 | PATCH | `/hr/internal-stock/:id/status` | hr | `hr.stock.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1160) |
| 252 | GET | `/hr/internal-stock/:id/movements` | hr | `hr.stock.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1189) |
| 253 | POST | `/hr/internal-stock/:id/movements` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1212) |
| 254 | GET | `/hr/budget-categories` | hr | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1266) |
| 255 | GET | `/hr/budget-category-concessions` | hr | `hr.budget.category.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1317) |
| 256 | POST | `/hr/budget-categories` | hr | `hr.budget.category.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1334) |
| 257 | PATCH | `/hr/budget-categories/:id` | hr | `hr.budget.category.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1377) |
| 258 | PATCH | `/hr/budget-categories/:id/status` | hr | `hr.budget.category.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1436) |
| 259 | GET | `/hr/budgets` | hr | `hr.budget.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1482) |
| 260 | GET | `/hr/budget-targets` | hr | `hr.budget.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1534) |
| 261 | GET | `/hr/concessions` | hr | `hr.budget.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1579) |
| 262 | POST | `/hr/budgets` | hr | `hr.budget.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1592) |
| 263 | POST | `/hr/budgets/:id/submit` | hr | `hr.budget.submit` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1679) |
| 264 | PATCH | `/hr/budgets/:id` | hr | `hr.budget.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1712) |
| 265 | POST | `/hr/budgets/:id/approve` | hr | `hr.budget.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1713) |
| 266 | POST | `/hr/budgets/:id/reject` | hr | `hr.budget.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1748) |
| 267 | POST | `/hr/budgets/:id/reopen` | hr | `hr.budget.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1782) |
| 268 | POST | `/hr/budgets/:id/cancel` | hr | `hr.budget.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1812) |
| 269 | POST | `/hr/budgets/:id/close` | hr | `hr.budget.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1853) |
| 270 | GET | `/hr/budgets/:id/approval-history` | hr | `hr.approval.history.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1915) |
| 271 | GET | `/hr/budgets/:id/funds` | hr | `hr.budget.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1934) |
| 272 | POST | `/hr/budgets/:id/funds` | hr | `hr.budget.fund.request` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1954) |
| 273 | GET | `/hr/budget-fund-requests` | hr | `hr.budget.fund.request.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1992) |
| 274 | POST | `/hr/budget-fund-requests/:id/approve` | hr | `hr.budget.fund.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1993) |
| 275 | POST | `/hr/budget-fund-requests/:id/reject` | hr | `hr.budget.fund.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1994) |
| 276 | GET | `/hr/expenses` | hr | `hr.expense.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L1995) |
| 277 | GET | `/hr/budgets/:id/expenses` | hr | `hr.expense.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2009) |
| 278 | POST | `/hr/budgets/:id/expenses` | hr | `hr.expense.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2058) |
| 279 | POST | `/hr/expenses/:id/submit` | hr | `hr.expense.submit` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2125) |
| 280 | POST | `/hr/expenses/:id/approve` | hr | `hr.expense.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2163) |
| 281 | POST | `/hr/expenses/:id/reject` | hr | `hr.expense.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2228) |
| 282 | POST | `/hr/expenses/:id/cancel` | hr | `hr.expense.cancel` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2275) |
| 283 | GET | `/hr/overview` | hr | `hr.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2353) |
| 284 | GET | `/hr/reporting` | hr | `hr.reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2453) |
| 285 | PATCH | `/hr/expenses/:id` | hr | `hr.expense.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/hr/hr.routes.ts#L2600) |
| 286 | GET | `/notifications` | notifications | `notifications.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L34) |
| 287 | GET | `/notifications/unread-count` | notifications | `notifications.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L50) |
| 288 | PATCH | `/notifications/read-all` | notifications | `notifications.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L52) |
| 289 | PATCH | `/notifications/:id/read` | notifications | `notifications.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L67) |
| 290 | PATCH | `/notifications/:id/archive` | notifications | `notifications.archive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L68) |
| 291 | DELETE | `/notifications/:id` | notifications | `notifications.delete` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L69) |
| 292 | GET | `/part-direct-purchases` | parts | `parts.direct_purchase.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L17) |
| 293 | GET | `/part-direct-purchases/:id` | parts | `parts.direct_purchase.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L23) |
| 294 | POST | `/part-direct-purchases` | parts | `parts.direct_purchase.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L29) |
| 295 | POST | `/part-direct-purchases/:id/receipts` | parts | `parts.direct_purchase.receive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L36) |
| 296 | POST | `/part-direct-purchases/:id/settlements` | parts | `parts.direct_purchase.settle` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L41) |
| 297 | GET | `/parts-internal-requests` | parts | `parts.internal_request.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L27) |
| 298 | GET | `/parts-internal-requests/:id` | parts | `parts.internal_request.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L29) |
| 299 | POST | `/parts-internal-requests/:id/deliveries` | parts | `parts.internal_delivery.dispatch` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L31) |
| 300 | POST | `/parts-internal-deliveries/:id/receive` | parts | `service.parts.receive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L33) |
| 301 | POST | `/parts-internal-delivery-items/:id/returns` | parts | `service.parts.return` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L35) |
| 302 | POST | `/parts-internal-returns/:id/receive` | parts | `parts.return.receive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L37) |
| 303 | GET | `/part-sales` | parts | `parts.sale.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L4) |
| 304 | GET | `/part-sales/:id` | parts | `parts.sale.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L5) |
| 305 | POST | `/part-sales` | parts | `parts.sale.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L6) |
| 306 | POST | `/part-sales/:id/release` | parts | `parts.sale.release` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L7) |
| 307 | POST | `/part-sale-items/:id/returns` | parts | `parts.sale.return` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L8) |
| 308 | POST | `/part-sale-returns/:id/decide` | parts | `parts.sale.return_decide` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L9) |
| 309 | GET | `/part-references` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L46) |
| 310 | GET | `/part-categories` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L47) |
| 311 | POST | `/part-categories` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L48) |
| 312 | PATCH | `/part-categories/:id` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L49) |
| 313 | GET | `/part-locations/agencies` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L54) |
| 314 | GET | `/part-locations` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L64) |
| 315 | POST | `/part-locations` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L69) |
| 316 | PATCH | `/part-locations/:id` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L79) |
| 317 | GET | `/suppliers` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L98) |
| 318 | GET | `/suppliers/:id` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L99) |
| 319 | POST | `/suppliers` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L101) |
| 320 | PATCH | `/suppliers/:id` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L102) |
| 321 | PATCH | `/suppliers/:id/status` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L103) |
| 322 | GET | `/parts` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L106) |
| 323 | GET | `/parts` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L124) |
| 324 | GET | `/parts/:id` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L125) |
| 325 | GET | `/parts/:id/movements` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L126) |
| 326 | POST | `/parts` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L127) |
| 327 | PATCH | `/parts/:id` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L128) |
| 328 | POST | `/parts/:id/inventory-count` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L129) |
| 329 | POST | `/parts/:id/adjustments` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L130) |
| 330 | POST | `/parts/:id/returns` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L131) |
| 331 | POST | `/parts/:id/transfers` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L132) |
| 332 | POST | `/parts/:id/movements` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L133) |
| 333 | GET | `/purchase-orders` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L136) |
| 334 | GET | `/purchase-orders/:id` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L137) |
| 335 | POST | `/purchase-orders` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L138) |
| 336 | PATCH | `/purchase-orders/:id` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L139) |
| 337 | POST | `/purchase-orders/:id/items` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L140) |
| 338 | PATCH | `/purchase-orders/:id/items/:itemId` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L141) |
| 339 | PATCH | `/purchase-orders/:id/status` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L142) |
| 340 | POST | `/purchase-orders/:id/receipts` | parts | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/part.routes.ts#L143) |
| 341 | GET | `/supplier-invoices` | parts | `supplier.invoice.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L31) |
| 342 | GET | `/supplier-invoices/indicators` | parts | `supplier.debt.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L32) |
| 343 | GET | `/supplier-invoices/options` | parts | `supplier.invoice.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L33) |
| 344 | POST | `/supplier-invoices` | parts | `supplier.invoice.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L34) |
| 345 | GET | `/supplier-invoices/:id` | parts | `supplier.invoice.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L35) |
| 346 | PATCH | `/supplier-invoices/:id` | parts | `supplier.invoice.update` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L36) |
| 347 | POST | `/supplier-invoices/:id/budget-link` | parts | `hr.expense.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L41) |
| 348 | POST | `/supplier-invoices/:id/payments` | parts | `supplier.payment.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L42) |
| 349 | POST | `/supplier-invoices/:id/credits` | parts | `supplier.credit.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L44) |
| 350 | POST | `/supplier-credits/:id/submit` | parts | `supplier.credit.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L45) |
| 351 | POST | `/supplier-credits/:id/validate` | parts | `supplier.credit.validate` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L47) |
| 352 | POST | `/supplier-credits/:id/reject` | parts | `supplier.credit.validate` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L48) |
| 353 | GET | `/supplier-invoices/:id/history` | parts | `supplier.invoice.history.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L49) |
| 354 | GET | `/proformas` | proformas | `proformas.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L60) |
| 355 | GET | `/proformas/:id` | proformas | `proformas.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L61) |
| 356 | GET | `/proformas/:id/pdf` | proformas | `proformas.export` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L62) |
| 357 | POST | `/proformas` | proformas | `proformas.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L64) |
| 358 | PATCH | `/proformas/:id` | proformas | `proformas.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L66) |
| 359 | POST | `/proformas/:id/issue` | proformas | `proformas.issue` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L68) |
| 360 | GET | `/quotations/config` | quotations | `quotations.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L10) |
| 361 | GET | `/quotations` | quotations | `quotations.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L11) |
| 362 | GET | `/quotations/opportunity/:opportunityId` | quotations | `quotations.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L12) |
| 363 | GET | `/quotations/opportunity/:opportunityId/vehicle-context` | quotations | `quotations.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L13) |
| 364 | GET | `/quotations/:id/pdf` | quotations | `quotations.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L14) |
| 365 | GET | `/quotations/:id` | quotations | `quotations.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L15) |
| 366 | POST | `/quotations` | quotations | `quotations.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L16) |
| 367 | PATCH | `/quotations/:id` | quotations | `quotations.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L17) |
| 368 | POST | `/quotations/:id/validate` | quotations | `quotations.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L18) |
| 369 | POST | `/quotations/:id/archive` | quotations | `quotations.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L19) |
| 370 | POST | `/quotations/:id/cancel` | quotations | `quotations.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L20) |
| 371 | GET | `/rbac/agencies` | rbac | `—` | Fonction technique | Socle validé | [source](../backend-node/src/modules/rbac/agency-rbac.routes.ts#L7) |
| 372 | GET | `/rbac/agency-context` | rbac | `—` | Fonction technique | Socle validé | [source](../backend-node/src/modules/rbac/agency-rbac.routes.ts#L8) |
| 373 | PUT | `/rbac/agency-context` | rbac | `—` | Fonction technique | Socle validé | [source](../backend-node/src/modules/rbac/agency-rbac.routes.ts#L9) |
| 374 | GET | `/reports/consolidated/commercial` | reports | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L19) |
| 375 | GET | `/reports/consolidated/treasury` | reports | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L25) |
| 376 | GET | `/reports/consolidated/budgets` | reports | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L27) |
| 377 | GET | `/reports/consolidated/hr` | reports | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L29) |
| 378 | GET | `/reports/consolidated/activity` | reports | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L36) |
| 379 | GET | `/reports/consolidated/returns` | reports | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L38) |
| 380 | GET | `/reports/financial/:section` | reports | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/financial-report.routes.ts#L4) |
| 381 | GET | `/reports/financial-export/:section` | reports | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/financial-report.routes.ts#L5) |
| 382 | GET | `/reports/margin-provenance` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L7) |
| 383 | GET | `/reports/overview` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L21) |
| 384 | GET | `/reports/revenue` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L22) |
| 385 | GET | `/reports/sales` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L23) |
| 386 | GET | `/reports/salespeople` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L24) |
| 387 | GET | `/reports/vehicles` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L25) |
| 388 | GET | `/reports/workshop` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L26) |
| 389 | GET | `/reports/warranties` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L27) |
| 390 | GET | `/reports/parts` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L28) |
| 391 | GET | `/reports/finance` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L29) |
| 392 | GET | `/reports/agencies` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L30) |
| 393 | GET | `/reports/export` | reports | `reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/reports/report.routes.ts#L31) |
| 394 | GET | `/sales` | sales | `sales.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L8) |
| 395 | GET | `/sales/config/direct-tax` | sales | `sales.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L9) |
| 396 | GET | `/sales/:id` | sales | `sales.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L10) |
| 397 | GET | `/vehicles/:id/warranty-proposal` | sales | `sales.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L11) |
| 398 | GET | `/sales/vehicles/:id/pricing-guard` | sales | `sales.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L12) |
| 399 | POST | `/sales` | sales | `sales.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L13) |
| 400 | PATCH | `/sales/:id` | sales | `sales.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L14) |
| 401 | PATCH | `/sales/:id/warranty` | sales | `sales.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L15) |
| 402 | PATCH | `/sales/:id/status` | sales | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/sales/sale.routes.ts#L16) |
| 403 | POST | `/sales/:id/archive` | sales | `sales.confirm` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L21) |
| 404 | GET | `/settings` | settings | `settings.general.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L6) |
| 405 | PUT | `/settings` | settings | `settings.general.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L7) |
| 406 | GET | `/concessions/current` | settings | `settings.general.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L8) |
| 407 | PATCH | `/concessions/current` | settings | `settings.general.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L9) |
| 408 | PUT | `/concessions/current/document-logo` | settings | `settings.general.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L10) |
| 409 | DELETE | `/concessions/current/document-logo` | settings | `settings.general.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L11) |
| 410 | GET | `/agencies` | settings | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L12) |
| 411 | GET | `/settings/agencies` | settings | `settings.agencies.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L13) |
| 412 | POST | `/agencies` | settings | `settings.agencies.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L14) |
| 413 | PATCH | `/agencies/:id` | settings | `settings.agencies.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L15) |
| 414 | PATCH | `/agencies/:id/status` | settings | `settings.agencies.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L16) |
| 415 | GET | `/workshop-labor-rates` | settings | `settings.workshop_rates.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L17) |
| 416 | POST | `/workshop-labor-rates` | settings | `settings.workshop_rates.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L18) |
| 417 | PATCH | `/workshop-labor-rates/:id` | settings | `settings.workshop_rates.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L19) |
| 418 | PUT | `/workshop-labor-rates/:id/agency-override` | settings | `settings.workshop_rates.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L20) |
| 419 | DELETE | `/workshop-labor-rates/:id/agency-override` | settings | `settings.workshop_rates.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L21) |
| 420 | GET | `/settings/manufacturers` | settings | `settings.manufacturers.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L22) |
| 421 | POST | `/settings/manufacturers` | settings | `settings.manufacturers.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L23) |
| 422 | PATCH | `/settings/manufacturers/:id` | settings | `settings.manufacturers.update` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L24) |
| 423 | PATCH | `/settings/manufacturers/:id/status` | settings | `settings.manufacturers.disable` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L25) |
| 424 | GET | `/settings/document-references` | settings | `settings.documents.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L26) |
| 425 | POST | `/settings/document-categories` | settings | `settings.documents.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L27) |
| 426 | PATCH | `/settings/document-categories/:id` | settings | `settings.documents.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L28) |
| 427 | POST | `/settings/document-types` | settings | `settings.documents.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L29) |
| 428 | PATCH | `/settings/document-types/:id` | settings | `settings.documents.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/settings/setting.routes.ts#L30) |
| 429 | PATCH | `/showroom/test-drives/:id/schedule` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L48) |
| 430 | PATCH | `/showroom/test-drives/:id/start` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L50) |
| 431 | PATCH | `/showroom/test-drives/:id/cancel` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L52) |
| 432 | GET | `/showroom/agencies/visitor-create` | showroom | `showroom.visitor.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L54) |
| 433 | GET | `/showroom/agencies/:agencyId/sales-candidates` | showroom | `showroom.assign` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L55) |
| 434 | GET | `/showroom/detect` | showroom | `showroom.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L57) |
| 435 | GET | `/showroom` | showroom | `showroom.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L59) |
| 436 | GET | `/showroom/test-drive-config` | showroom | `showroom.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L61) |
| 437 | GET | `/showroom/:id` | showroom | `showroom.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L63) |
| 438 | POST | `/showroom/crm/leads/:leadId/test-drives` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L65) |
| 439 | POST | `/showroom` | showroom | `showroom.visitor.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L96) |
| 440 | PATCH | `/showroom/:id/assign` | showroom | `showroom.assign` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L98) |
| 441 | PATCH | `/showroom/:id/take-over` | showroom | `showroom.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L100) |
| 442 | PATCH | `/showroom/:id/complete` | showroom | `showroom.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L102) |
| 443 | PATCH | `/showroom/:id/cancel` | showroom | `showroom.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L104) |
| 444 | POST | `/showroom/:id/test-drives` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L106) |
| 445 | PATCH | `/showroom/test-drives/:id/complete` | showroom | `showroom.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L130) |
| 446 | POST | `/showroom/:id/convert-to-lead` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L132) |
| 447 | GET | `/treasury/bank-statements` | treasury | `treasury.reconciliation.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L3) |
| 448 | POST | `/treasury/bank-statements/preview` | treasury | `treasury.reconciliation.import` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L4) |
| 449 | GET | `/treasury/bank-statements/:id` | treasury | `treasury.reconciliation.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L5) |
| 450 | POST | `/treasury/bank-statements/:id/validate` | treasury | `treasury.reconciliation.validate_import` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L6) |
| 451 | POST | `/treasury/bank-statements/:id/reject` | treasury | `treasury.reconciliation.validate_import` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L7) |
| 452 | POST | `/treasury/bank-statements/:id/cancel` | treasury | `treasury.reconciliation.validate_import` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L8) |
| 453 | GET | `/treasury/bank-statements/:id/history` | treasury | `treasury.reconciliation.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L9) |
| 454 | GET | `/treasury/bank-statement-lines/:id/proposals` | treasury | `treasury.reconciliation.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L10) |
| 455 | POST | `/treasury/bank-reconciliations` | treasury | `treasury.reconciliation.reconcile` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L11) |
| 456 | POST | `/treasury/bank-reconciliations/:id/cancel` | treasury | `treasury.reconciliation.cancel` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L12) |
| 457 | GET | `/treasury/bank-unmatched` | treasury | `treasury.reconciliation.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L13) |
| 458 | GET | `/treasury/bank-statements/:id/export` | treasury | `treasury.reconciliation.export` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L14) |
| 459 | GET | `/treasury/accounts` | treasury | `treasury.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L9) |
| 460 | GET | `/treasury/account-territories` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L14) |
| 461 | GET | `/treasury/accounts/:id` | treasury | `treasury.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L19) |
| 462 | POST | `/treasury/accounts` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L24) |
| 463 | PATCH | `/treasury/accounts/:id` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L31) |
| 464 | PATCH | `/treasury/accounts/:id/status` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L38) |
| 465 | GET | `/treasury/categories` | treasury | `treasury.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L45) |
| 466 | POST | `/treasury/categories` | treasury | `treasury.category.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L50) |
| 467 | PATCH | `/treasury/categories/:id` | treasury | `treasury.category.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L57) |
| 468 | PATCH | `/treasury/categories/:id/status` | treasury | `treasury.category.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L64) |
| 469 | GET | `/treasury/journal` | treasury | `treasury.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L71) |
| 470 | GET | `/treasury/journal/export` | treasury | `treasury.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L76) |
| 471 | GET | `/treasury/journal/:id` | treasury | `treasury.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L141) |
| 472 | GET | `/treasury/summary` | treasury | `treasury.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L146) |
| 473 | GET | `/treasury/coverage` | treasury | `treasury.coverage.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L151) |
| 474 | GET | `/treasury/budget-indicators` | treasury | `treasury.coverage.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L156) |
| 475 | GET | `/treasury/reservations` | treasury | `treasury.reservation.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L161) |
| 476 | GET | `/treasury/reservation-expenses` | treasury | `treasury.reservation.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L166) |
| 477 | POST | `/treasury/reservations` | treasury | `treasury.reservation.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L167) |
| 478 | POST | `/treasury/reservations/:id/submit` | treasury | `treasury.reservation.submit` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L174) |
| 479 | POST | `/treasury/reservations/:id/approve` | treasury | `treasury.reservation.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L175) |
| 480 | POST | `/treasury/reservations/:id/reject` | treasury | `treasury.reservation.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L176) |
| 481 | POST | `/treasury/reservations/:id/cancel` | treasury | `treasury.reservation.cancel` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L177) |
| 482 | POST | `/treasury/reservations/:id/expire` | treasury | `treasury.reservation.expire` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L178) |
| 483 | PATCH | `/treasury/reservations/:id` | treasury | `treasury.reservation.adjust` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L179) |
| 484 | POST | `/treasury/reservations/:id/release` | treasury | `treasury.reservation.release` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L186) |
| 485 | GET | `/treasury/reservations/:id/history` | treasury | `treasury.reservation.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L193) |
| 486 | GET | `/treasury/manual-options` | treasury | `treasury.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L200) |
| 487 | POST | `/treasury/transfers` | treasury | `treasury.transfer.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L205) |
| 488 | POST | `/treasury/manual-receipts` | treasury | `treasury.receipt.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L212) |
| 489 | POST | `/treasury/manual-disbursements` | treasury | `treasury.disbursement.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L219) |
| 490 | GET | `/hr/budget-expenses/:id/disbursements` | treasury | `hr.expense.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L226) |
| 491 | POST | `/hr/budget-expenses/:id/disbursements` | treasury | `hr.expense.disburse` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L233) |
| 492 | POST | `/treasury/movements/:id/reversal` | treasury | `treasury.reverse` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L241) |
| 493 | GET | `/treasury/flow-configuration` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L248) |
| 494 | PUT | `/treasury/flow-mappings` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L253) |
| 495 | PATCH | `/treasury/flow-mappings/:id` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L258) |
| 496 | PATCH | `/treasury/flow-mappings/:id/status` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L265) |
| 497 | DELETE | `/treasury/flow-mappings/:id` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L272) |
| 498 | PATCH | `/treasury/flow-readiness` | treasury | `treasury.account.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L279) |
| 499 | GET | `/users/directory` | users | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L14) |
| 500 | GET | `/users/me` | users | `—` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/users/user.routes.ts#L15) |
| 501 | PATCH | `/users/me` | users | `—` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/users/user.routes.ts#L16) |
| 502 | PATCH | `/users/me/password` | users | `—` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/users/user.routes.ts#L17) |
| 503 | POST | `/users/me/avatar` | users | `—` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/users/user.routes.ts#L18) |
| 504 | DELETE | `/users/me/avatar` | users | `—` | Fonction personnelle | Conservé à auditer | [source](../backend-node/src/modules/users/user.routes.ts#L19) |
| 505 | GET | `/users` | users | `users.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L20) |
| 506 | GET | `/users/:id` | users | `users.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L21) |
| 507 | POST | `/users` | users | `users.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L22) |
| 508 | PATCH | `/users/:id` | users | `users.update` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L23) |
| 509 | PATCH | `/users/:id/status` | users | `users.disable` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L24) |
| 510 | PATCH | `/users/:id/password` | users | `users.reset_password` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L25) |
| 511 | POST | `/users/:id/avatar` | users | `users.update` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L26) |
| 512 | DELETE | `/users/:id/avatar` | users | `users.update` | Métier à migrer | À auditer | [source](../backend-node/src/modules/users/user.routes.ts#L27) |
| 513 | GET | `/users/:id/agencies` | users | `users.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L28) |
| 514 | POST | `/users/:id/agencies` | users | `users.assign_agency` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L29) |
| 515 | PATCH | `/users/:id/agencies/:assignmentId/status` | users | `users.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L30) |
| 516 | PATCH | `/users/:id/agencies/:assignmentId/primary` | users | `users.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L31) |
| 517 | POST | `/users/:id/agencies/:assignmentId/roles` | users | `users.assign_role` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L32) |
| 518 | DELETE | `/users/:id/agencies/:assignmentId/roles/:roleId` | users | `users.assign_role` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L33) |
| 519 | GET | `/permissions` | users | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L34) |
| 520 | GET | `/roles` | users | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L35) |
| 521 | GET | `/roles/:id/permissions` | users | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L36) |
| 522 | POST | `/roles` | users | `roles.create` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L37) |
| 523 | PATCH | `/roles/:id` | users | `roles.update` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L38) |
| 524 | PATCH | `/roles/:id/status` | users | `roles.disable` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L39) |
| 525 | DELETE | `/roles/:id` | users | `roles.delete` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L40) |
| 526 | GET | `/vehicle-returns` | vehicle-returns | `vehicle.return.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L31) |
| 527 | GET | `/vehicle-returns/:id` | vehicle-returns | `vehicle.return.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L32) |
| 528 | GET | `/vehicle-returns/:id/options` | vehicle-returns | `vehicle.return.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L33) |
| 529 | POST | `/vehicle-returns` | vehicle-returns | `vehicle.return.create` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L35) |
| 530 | POST | `/vehicle-returns/:id/inspection` | vehicle-returns | `vehicle.return.inspect` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L37) |
| 531 | POST | `/vehicle-returns/:id/approve` | vehicle-returns | `vehicle.return.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L40) |
| 532 | POST | `/vehicle-returns/:id/reject` | vehicle-returns | `vehicle.return.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L41) |
| 533 | POST | `/vehicle-returns/:id/deductions` | vehicle-returns | `vehicle.return.financial.resolve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L43) |
| 534 | DELETE | `/vehicle-returns/:id/deductions/:deductionId` | vehicle-returns | `vehicle.return.financial.resolve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L44) |
| 535 | POST | `/vehicle-returns/:id/financial-resolution` | vehicle-returns | `vehicle.return.financial.resolve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L46) |
| 536 | POST | `/vehicle-returns/:id/receive` | vehicle-returns | `vehicle.return.stock.receive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L48) |
| 537 | POST | `/vehicle-returns/:id/stock-decision` | vehicle-returns | `vehicle.return.stock.receive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L50) |
| 538 | POST | `/vehicle-returns/:id/close` | vehicle-returns | `vehicle.return.stock.receive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L52) |
| 539 | POST | `/vehicle-returns/:id/archive` | vehicle-returns | `vehicle.return.stock.receive` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L53) |
| 540 | GET | `/vehicle-returns/:id/pdf` | vehicle-returns | `vehicle.return.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L54) |
| 541 | GET | `/vehicle-returns/:id/credit-notes/:creditNoteId/pdf` | vehicle-returns | `vehicle.return.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L55) |
| 542 | POST | `/vehicle-returns/:id/credit-notes/:creditNoteId/archive` | vehicle-returns | `vehicle.return.financial.resolve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L56) |
| 543 | GET | `/commercial-models` | vehicles | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L19) |
| 544 | GET | `/commercial-models/by-version/:versionId` | vehicles | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L20) |
| 545 | GET | `/commercial-models/by-version/:versionId/impact` | vehicles | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L21) |
| 546 | GET | `/commercial-models/:id` | vehicles | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L22) |
| 547 | GET | `/commercial-models/:id/impact` | vehicles | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L23) |
| 548 | POST | `/commercial-models` | vehicles | `vehicles.catalog.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L24) |
| 549 | PATCH | `/commercial-models/:id` | vehicles | `vehicles.catalog.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L25) |
| 550 | POST | `/commercial-models/:id/images` | vehicles | `vehicles.catalog.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L27) |
| 551 | PATCH | `/commercial-models/:id/images/:imageId/primary` | vehicles | `vehicles.catalog.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L28) |
| 552 | PATCH | `/commercial-models/:id/images/order` | vehicles | `vehicles.catalog.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L29) |
| 553 | DELETE | `/commercial-models/:id/images/:imageId` | vehicles | `vehicles.catalog.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L30) |
| 554 | GET | `/vehicle-locations` | vehicles | `vehicles.assignments.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L43) |
| 555 | POST | `/vehicle-locations` | vehicles | `vehicles.assignments.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L50) |
| 556 | PATCH | `/vehicle-locations/:id` | vehicles | `vehicles.assignments.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L55) |
| 557 | GET | `/vehicle-transfer-agencies` | vehicles | `vehicles.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L60) |
| 558 | GET | `/vehicle-transfer-locations` | vehicles | `vehicles.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L65) |
| 559 | GET | `/vehicles/stats` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L83) |
| 560 | GET | `/vehicles/location-counts` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L90) |
| 561 | GET | `/vehicles/agencies/create` | vehicles | `vehicles.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L97) |
| 562 | GET | `/documents/business/vehicle/:id/pdf` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L125) |
| 563 | GET | `/vehicle-references` | vehicles | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L127) |
| 564 | GET | `/vehicles/warranty-providers/eligible` | vehicles | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L128) |
| 565 | GET | `/vehicles/filter-options` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L134) |
| 566 | GET | `/vehicles` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L149) |
| 567 | GET | `/vehicles/:id` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L166) |
| 568 | GET | `/vehicles/:id/360` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L173) |
| 569 | POST | `/vehicles` | vehicles | `vehicles.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L196) |
| 570 | PATCH | `/vehicles/:id` | vehicles | `vehicles.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L234) |
| 571 | PATCH | `/vehicles/:id/status` | vehicles | `vehicles.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L270) |
| 572 | POST | `/vehicles/:id/transfer` | vehicles | `vehicles.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L272) |
| 573 | POST | `/vehicles/:id/images` | vehicles | `vehicles.images.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L276) |
| 574 | PATCH | `/vehicles/:id/images/:imageId/primary` | vehicles | `vehicles.images.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L277) |
| 575 | DELETE | `/vehicles/:id/images/:imageId` | vehicles | `vehicles.images.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L278) |
| 576 | GET | `/sav/invoices` | workshop | `service.billing.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L23) |
| 577 | GET | `/sav/transit/destinations` | workshop | `service.transit.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L38) |
| 578 | GET | `/sav/transit` | workshop | `service.transit.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L43) |
| 579 | POST | `/sav/transit` | workshop | `service.transit.initiate` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L49) |
| 580 | POST | `/sav/transit/:id/decision` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L64) |
| 581 | POST | `/sav/transit/:id/cancel` | workshop | `service.transit.resolve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L69) |
| 582 | GET | `/sav/journal` | workshop | `service.journal.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L73) |
| 583 | GET | `/sav/reporting` | workshop | `service.reporting.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L81) |
| 584 | GET | `/warranty-providers` | workshop | `service.order.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L11) |
| 585 | GET | `/repair-orders/:id/warranty` | workshop | `service.order.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L12) |
| 586 | PUT | `/repair-orders/:id/warranty` | workshop | `service.warranty.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L13) |
| 587 | POST | `/repair-orders/:id/warranty/decision` | workshop | `service.warranty.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L14) |
| 588 | PUT | `/repair-orders/:id/warranty/allocations` | workshop | `service.warranty.manage` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L15) |
| 589 | POST | `/repair-orders/:id/warranty/confirm` | workshop | `service.warranty.approve` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L16) |
| 590 | POST | `/warranty-claims/:id/payments` | workshop | `billing.payment.collect` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L17) |
| 591 | GET | `/workshop/vehicles/search` | workshop | `workshop.vehicles.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L35) |
| 592 | POST | `/workshop/external-vehicles` | workshop | `workshop.external_vehicle.create, workshop.vehicle.associations.create, workshop.vehicles.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L53) |
| 593 | POST | `/workshop/vehicle-associations` | workshop | `workshop.vehicle.associations.create, workshop.vehicles.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L67) |
| 594 | GET | `/workshop/customers/:customerId/vehicle-associations` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L69) |
| 595 | PATCH | `/workshop/vehicle-associations/:id/close` | workshop | `workshop.vehicle.associations.close` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L75) |
| 596 | GET | `/workshop/config` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L167) |
| 597 | GET | `/repair-orders/:id/technician-candidates` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L384) |
| 598 | GET | `/repair-orders/:id/labor-rates` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L389) |
| 599 | GET | `/repair-orders/:id/available-parts` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L392) |
| 600 | GET | `/repair-orders/:id/available-parts/:partId/stocks` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L397) |
| 601 | GET | `/parts-work-queue` | workshop | `parts.reservation.view` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L402) |
| 602 | GET | `/parts-work-queue/:id` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L406) |
| 603 | GET | `/workshop/external-customers` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L412) |
| 604 | GET | `/workshop/external-customers/:customerId` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L420) |
| 605 | GET | `/repair-orders/advisor-candidates` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L428) |
| 606 | GET | `/repair-orders/customer-candidates` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L436) |
| 607 | GET | `/repair-orders/customer-vehicles` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L446) |
| 608 | GET | `/repair-orders` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L452) |
| 609 | GET | `/repair-orders/stats` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L478) |
| 610 | GET | `/repair-orders/:id` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L499) |
| 611 | GET | `/repair-orders/vehicles/:vehicleId/warranty-eligibility` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L504) |
| 612 | GET | `/repair-orders/:id/abandonment-impact` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L505) |
| 613 | POST | `/repair-orders/:id/abandonment` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L506) |
| 614 | POST | `/repair-orders/:id/abandonment/finalize` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L507) |
| 615 | POST | `/repair-orders/:id/abandonment/handover` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L508) |
| 616 | POST | `/repair-orders` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L509) |
| 617 | PATCH | `/repair-orders/:id/status` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L572) |
| 618 | POST | `/repair-orders/:id/inspection` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L639) |
| 619 | POST | `/repair-orders/:id/diagnostics` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L675) |
| 620 | POST | `/repair-orders/:id/estimate/issue` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L694) |
| 621 | PATCH | `/repair-orders/:id/tax-mode` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L701) |
| 622 | POST | `/repair-orders/:id/estimate-items` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L710) |
| 623 | DELETE | `/repair-orders/:id/estimate-items/:itemId` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L747) |
| 624 | POST | `/repair-orders/:id/approval` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L752) |
| 625 | POST | `/repair-orders/:id/estimate-supplements` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L781) |
| 626 | POST | `/repair-orders/:id/estimate-supplements/:supplementId/decision` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L788) |
| 627 | GET | `/service-appointments` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L793) |
| 628 | POST | `/service-appointments` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L801) |
| 629 | PATCH | `/service-appointments/:id/status` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L817) |
| 630 | POST | `/repair-orders/:id/items` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L829) |
| 631 | PATCH | `/repair-orders/:id/items/:itemId` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L902) |
| 632 | DELETE | `/repair-orders/:id/items/:itemId` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L903) |
| 633 | POST | `/repair-orders/:id/estimate-items/:estimateItemId/intervention` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L904) |
| 634 | POST | `/repair-orders/:id/interventions` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L920) |
| 635 | PATCH | `/repair-orders/:id/interventions/:interventionId/status` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L933) |
| 636 | POST | `/repair-orders/:id/estimate-items/:estimateItemId/reserve` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L944) |
| 637 | POST | `/repair-orders/:id/parts/reserve` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L966) |
| 638 | PATCH | `/repair-orders/:id/parts/reservations/:reservationId` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L988) |
| 639 | POST | `/repair-orders/:id/invoice` | workshop | `billing.invoice.create, billing.invoice.issue` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1020) |
| 640 | POST | `/repair-orders/:id/quality-control` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1057) |
| 641 | POST | `/repair-orders/:id/handover` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1073) |
| 642 | PATCH | `/repair-orders/:id/advisor` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1074) |
| 643 | POST | `/repair-orders/:id/assign` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1075) |
| 644 | GET | `/workshop/technicians` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1103) |
| 645 | GET | `/workshop/bays` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1116) |
| 646 | POST | `/workshop/bays` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1117) |
| 647 | PATCH | `/workshop/bays/:id` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1118) |
| 648 | POST | `/workshop/technicians` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1119) |
| 649 | PATCH | `/workshop/technicians/:id` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1120) |
| 650 | POST | `/workshop/technicians/:id/unavailability` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1121) |
| 651 | GET | `/workshop/unavailabilities` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1122) |
| 652 | DELETE | `/workshop/unavailabilities/:id` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1123) |
| 653 | GET | `/workshop/planning` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1124) |
| 654 | GET | `/workshop/interventions/history` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1138) |
| 655 | GET | `/workshop/stats` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1145) |
| 656 | PATCH | `/workshop/schedules/:id` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1146) |
| 657 | DELETE | `/workshop/schedules/:id` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1147) |
| 658 | POST | `/repair-orders/:id/sessions/start` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1148) |
| 659 | PATCH | `/repair-orders/:id/sessions/:sessionId/pause` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1156) |
| 660 | PATCH | `/repair-orders/:id/sessions/:sessionId/resume` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1157) |
| 661 | PATCH | `/repair-orders/:id/sessions/:sessionId/stop` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1158) |
| 662 | PATCH | `/workshop/time-entries/:id` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1168) |
| 663 | GET | `/repair-orders/:id/pdf` | workshop | `—` | Métier à migrer | À auditer | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1169) |
