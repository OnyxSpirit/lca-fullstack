# Inventaire final des endpoints RBAC

Généré le 10 novembre 2026 depuis l'AST TypeScript des fichiers `*.routes.ts`. Cette référence compte les appels HTTP portés par un routeur Express ; elle exclut les appels homonymes `.get()` sur les maps de permissions qui avaient gonflé le comptage historique à 727.

## Synthèse initiale

- Déclarations HTTP réelles : **662**.
- Fichiers de routes : **47**.
- Les statuts automatiques sont volontairement conservateurs. Seul « Migré » correspond à un garde métier/central du nouveau socle ; la validation finale exige encore l'audit du service, du SQL, des transactions, de Socket.IO et des tests.
- Les colonnes ressource, agence réelle, propriétaire, transaction, événements et tests sont renseignées dans la matrice d'autorisations au fur et à mesure de la validation des groupes ; elles ne sont jamais déduites du seul nom de route.

| Statut initial | Nombre |
|---|---:|
| Conservé | 8 |
| Hors scope métier | 7 |
| Migré | 644 |
| Socle validé | 3 |

## Inventaire route par route

| # | Méthode | Route | Module | Permission visible | Classe initiale | Statut | Déclaration |
|---:|---|---|---|---|---|---|---|
| 1 | GET | `/activity/filters` | activity | `activity.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/activity/activity.routes.ts#L40) |
| 2 | GET | `/activity/print/pdf` | activity | `activity.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/activity/activity.routes.ts#L76) |
| 3 | GET | `/activity/:id/print/pdf` | activity | `activity.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/activity/activity.routes.ts#L83) |
| 4 | GET | `/activity/:id` | activity | `activity.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/activity/activity.routes.ts#L87) |
| 5 | GET | `/activity` | activity | `activity.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/activity/activity.routes.ts#L89) |
| 6 | POST | `/login` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L28) |
| 7 | POST | `/2fa/verify` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L29) |
| 8 | POST | `/2fa/recovery` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L30) |
| 9 | POST | `/2fa/challenge/setup` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L31) |
| 10 | POST | `/2fa/challenge/confirm` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L32) |
| 11 | POST | `/2fa/step-up` | auth | `—` | Fonction personnelle | Conservé | [source](../backend-node/src/modules/auth/auth.routes.ts#L33) |
| 12 | GET | `/2fa/status` | auth | `auth.2fa.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/auth.routes.ts#L34) |
| 13 | POST | `/2fa/setup` | auth | `auth.2fa.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/auth.routes.ts#L35) |
| 14 | POST | `/2fa/confirm` | auth | `auth.2fa.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/auth.routes.ts#L36) |
| 15 | POST | `/2fa/disable` | auth | `auth.2fa.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/auth.routes.ts#L37) |
| 16 | POST | `/2fa/recovery/regenerate` | auth | `auth.2fa.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/auth.routes.ts#L38) |
| 17 | POST | `/refresh` | auth | `—` | Publique ou pré-authentification | Hors scope métier | [source](../backend-node/src/modules/auth/auth.routes.ts#L39) |
| 18 | GET | `/me` | auth | `—` | Fonction personnelle | Conservé | [source](../backend-node/src/modules/auth/auth.routes.ts#L40) |
| 19 | POST | `/logout` | auth | `—` | Fonction personnelle | Conservé | [source](../backend-node/src/modules/auth/auth.routes.ts#L41) |
| 20 | GET | `/auth/2fa/users/:id` | auth | `auth.2fa.users.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L11) |
| 21 | PATCH | `/auth/2fa/users/:id/requirement` | auth | `auth.2fa.users.enforce` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L12) |
| 22 | POST | `/auth/2fa/users/:id/reset` | auth | `auth.2fa.users.reset` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L13) |
| 23 | GET | `/auth/2fa/role-policies` | auth | `auth.2fa.policy.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L14) |
| 24 | PUT | `/auth/2fa/role-policies/:id` | auth | `auth.2fa.policy.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L15) |
| 25 | GET | `/auth/2fa/security-settings` | auth | `auth.2fa.settings.view` | Administration centrale | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L16) |
| 26 | PUT | `/auth/2fa/security-settings` | auth | `auth.2fa.settings.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L17) |
| 27 | GET | `/auth/2fa/security-center/overview` | auth | `—` | Contrôle effectif dans le service | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L18) |
| 28 | GET | `/auth/2fa/security-center/users` | auth | `auth.2fa.users.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L19) |
| 29 | GET | `/auth/2fa/devices/me` | auth | `auth.2fa.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L20) |
| 30 | DELETE | `/auth/2fa/devices/me/current` | auth | `auth.2fa.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L21) |
| 31 | DELETE | `/auth/2fa/devices/me/:id` | auth | `auth.2fa.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L22) |
| 32 | GET | `/auth/2fa/devices` | auth | `auth.2fa.devices.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L23) |
| 33 | DELETE | `/auth/2fa/devices/:id/permanent` | auth | `auth.2fa.devices.delete` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L24) |
| 34 | DELETE | `/auth/2fa/devices/:id` | auth | `auth.2fa.devices.revoke` | Métier déjà migré | Migré | [source](../backend-node/src/modules/auth/two-factor-admin.routes.ts#L25) |
| 35 | GET | `/invoices/payment-methods` | billing | `billing.payment.collect` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L53) |
| 36 | GET | `/billing/config` | billing | `billing.invoice.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L54) |
| 37 | GET | `/invoices/export/accounting` | billing | `billing.export` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L55) |
| 38 | GET | `/invoices` | billing | `billing.invoice.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L64) |
| 39 | GET | `/invoices/:id` | billing | `billing.invoice.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L80) |
| 40 | POST | `/invoices` | billing | `billing.invoice.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L88) |
| 41 | POST | `/invoices` | billing | `billing.invoice.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L89) |
| 42 | PATCH | `/invoices/:id` | billing | `billing.invoice.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L90) |
| 43 | PATCH | `/invoices/:id/status` | billing | `billing.invoice.issue` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L91) |
| 44 | POST | `/invoices/:id/cancel` | billing | `billing.invoice.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L92) |
| 45 | GET | `/invoices/:id/payments` | billing | `billing.payment.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L94) |
| 46 | POST | `/invoices/:id/archive` | billing | `billing.invoice.issue` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L104) |
| 47 | POST | `/payments/:id/receipt/archive` | billing | `billing.payment.collect` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L106) |
| 48 | POST | `/invoices/:id/payments` | billing | `billing.payment.collect` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L107) |
| 49 | GET | `/invoices/:id/credit-notes` | billing | `billing.payment.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L108) |
| 50 | POST | `/invoices/:id/credit-notes` | billing | `billing.invoice.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L109) |
| 51 | POST | `/credit-notes/:id/archive` | billing | `billing.invoice.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L111) |
| 52 | POST | `/payments/:id/refund` | billing | `billing.payment.refund` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L112) |
| 53 | GET | `/invoices/:id/pdf` | billing | `billing.invoice.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L114) |
| 54 | GET | `/payments/:id/receipt` | billing | `billing.payment.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L115) |
| 55 | GET | `/credit-notes/:id/pdf` | billing | `billing.invoice.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/billing/billing.routes.ts#L116) |
| 56 | GET | `/documents/business/sale/:id/pdf` | core | `sales.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/core/core.routes.ts#L10) |
| 57 | GET | `/crm/team-members` | crm | `crm.prospect.assign` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L58) |
| 58 | GET | `/leads/duplicates` | crm | `crm.prospect.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L60) |
| 59 | GET | `/leads` | crm | `crm.prospect.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L67) |
| 60 | GET | `/leads/:id` | crm | `crm.prospect.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L75) |
| 61 | POST | `/leads` | crm | `crm.prospect.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L77) |
| 62 | PATCH | `/leads/:id` | crm | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/crm/crm.routes.ts#L86) |
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
| 78 | GET | `/customers/:id/360` | customers | `customers.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/customers/customer.routes.ts#L142) |
| 79 | GET | `/dashboard/overview` | dashboard | `dashboard.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/dashboard/dashboard.routes.ts#L20) |
| 80 | GET | `/global-search` | dashboard | `dashboard.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/dashboard/dashboard.routes.ts#L40) |
| 81 | GET | `/delivery-checklist-config` | deliveries | `delivery.checklist.config.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L32) |
| 82 | POST | `/delivery-checklist-config/categories` | deliveries | `delivery.checklist.config.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L39) |
| 83 | PATCH | `/delivery-checklist-config/categories/:id` | deliveries | `delivery.checklist.config.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L43) |
| 84 | PATCH | `/delivery-checklist-config/categories/:id/status` | deliveries | `delivery.checklist.config.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L44) |
| 85 | POST | `/delivery-checklist-config/categories/reorder` | deliveries | `delivery.checklist.config.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L46) |
| 86 | POST | `/delivery-checklist-config/categories/:categoryId/items` | deliveries | `delivery.checklist.config.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L48) |
| 87 | PATCH | `/delivery-checklist-config/items/:id` | deliveries | `delivery.checklist.config.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L49) |
| 88 | PATCH | `/delivery-checklist-config/items/:id/status` | deliveries | `delivery.checklist.config.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L50) |
| 89 | POST | `/delivery-checklist-config/categories/:categoryId/items/reorder` | deliveries | `delivery.checklist.config.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-checklist.routes.ts#L51) |
| 90 | GET | `/delivery-services/catalog` | deliveries | `delivery.service.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L24) |
| 91 | POST | `/delivery-services/catalog` | deliveries | `delivery.service.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L26) |
| 92 | PATCH | `/delivery-services/catalog/:id` | deliveries | `delivery.service.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L28) |
| 93 | PATCH | `/delivery-services/catalog/:id/status` | deliveries | `delivery.service.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L30) |
| 94 | GET | `/deliveries/:id/services` | deliveries | `delivery.service.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L32) |
| 95 | POST | `/deliveries/:id/services` | deliveries | `delivery.service.add` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery-service.routes.ts#L34) |
| 96 | GET | `/deliveries` | deliveries | `delivery.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L141) |
| 97 | GET | `/deliveries/stats` | deliveries | `delivery.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L217) |
| 98 | GET | `/deliveries/candidates` | deliveries | `delivery.schedule` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L235) |
| 99 | GET | `/deliveries/candidates/:saleId/specialists` | deliveries | `delivery.schedule` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L241) |
| 100 | GET | `/delivery/financial-authorizations/:saleId` | deliveries | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L254) |
| 101 | POST | `/delivery/financial-authorizations` | deliveries | `delivery.financial_override.authorize` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L262) |
| 102 | POST | `/delivery/financial-authorizations/:authorizationId/revoke` | deliveries | `delivery.financial_override.authorize` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L290) |
| 103 | GET | `/deliveries/:id/checklist-applicable-categories` | deliveries | `delivery.prepare` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L305) |
| 104 | GET | `/deliveries/:id` | deliveries | `delivery.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L315) |
| 105 | POST | `/deliveries` | deliveries | `delivery.schedule` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L330) |
| 106 | PATCH | `/deliveries/:id/status` | deliveries | `delivery.prepare` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L410) |
| 107 | PATCH | `/deliveries/:id/cancel` | deliveries | `delivery.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L476) |
| 108 | PATCH | `/deliveries/:id/reschedule` | deliveries | `delivery.schedule` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L497) |
| 109 | PATCH | `/deliveries/:id/checklist/:itemId` | deliveries | `delivery.checklist.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L536) |
| 110 | POST | `/deliveries/:id/documents` | deliveries | `delivery.checklist.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L570) |
| 111 | PATCH | `/deliveries/:id/documents/:documentId` | deliveries | `delivery.checklist.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L616) |
| 112 | GET | `/deliveries/:id/documents/:documentId/download` | deliveries | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L635) |
| 113 | POST | `/deliveries/:id/sign` | deliveries | `delivery.signature.capture, delivery.complete` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L653) |
| 114 | GET | `/deliveries/:id/pdf` | deliveries | `delivery.view, delivery.documents.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L726) |
| 115 | GET | `/deliveries-planning/pdf` | deliveries | `delivery.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/deliveries/delivery.routes.ts#L742) |
| 116 | GET | `/document-marks/signature/me` | document-marks | `signature.view.self` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L67) |
| 117 | POST | `/document-marks/signature/me` | document-marks | `signature.manage.self` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L69) |
| 118 | DELETE | `/document-marks/signature/me` | document-marks | `signature.manage.self` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L80) |
| 119 | GET | `/document-marks/signature/me/:id/image` | document-marks | `signature.view.self` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L86) |
| 120 | GET | `/document-marks/stamps` | document-marks | `stamp.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L94) |
| 121 | POST | `/document-marks/stamps` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L109) |
| 122 | POST | `/document-marks/stamps/:id/version` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L121) |
| 123 | PATCH | `/document-marks/stamps/:id/document-types` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L133) |
| 124 | GET | `/document-marks/stamps/:id/versions` | document-marks | `stamp.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L143) |
| 125 | PATCH | `/document-marks/stamps/:id/status` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L147) |
| 126 | GET | `/document-marks/stamps/:stampId/versions/:versionId/image` | document-marks | `stamp.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L156) |
| 127 | GET | `/document-marks/types` | document-marks | `stamp.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L161) |
| 128 | GET | `/document-marks/categories` | document-marks | `stamp.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L163) |
| 129 | POST | `/document-marks/categories` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L170) |
| 130 | PATCH | `/document-marks/categories/:id` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L176) |
| 131 | GET | `/document-marks/policies` | document-marks | `stamp.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L184) |
| 132 | PUT | `/document-marks/policies/:documentType` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L187) |
| 133 | GET | `/roles/:roleId/stamps` | document-marks | `stamp.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L200) |
| 134 | PUT | `/roles/:roleId/stamps` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/document-mark.routes.ts#L203) |
| 135 | POST | `/document-marks/stamps/:id/revoke` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts#L28) |
| 136 | DELETE | `/document-marks/stamps/:id` | document-marks | `stamp.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts#L49) |
| 137 | GET | `/documents/references` | documents | `ged.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L11) |
| 138 | GET | `/documents/entities/search` | documents | `ged.upload` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L12) |
| 139 | GET | `/documents/entity/:entityType/:entityId` | documents | `ged.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L13) |
| 140 | GET | `/documents` | documents | `ged.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L14) |
| 141 | GET | `/documents/:id` | documents | `ged.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L15) |
| 142 | POST | `/documents` | documents | `ged.upload` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L16) |
| 143 | GET | `/documents/:id/preview` | documents | `ged.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L19) |
| 144 | GET | `/documents/:id/download` | documents | `ged.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L20) |
| 145 | DELETE | `/documents/:id` | documents | `ged.archive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L21) |
| 146 | POST | `/documents/:id/restore` | documents | `ged.archive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L22) |
| 147 | POST | `/documents/:id/version` | documents | `ged.upload` | Métier déjà migré | Migré | [source](../backend-node/src/modules/documents/document.routes.ts#L23) |
| 148 | GET | `/hr/bonus-types` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L8) |
| 149 | POST | `/hr/bonus-types` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L9) |
| 150 | PATCH | `/hr/bonus-types/:id` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L10) |
| 151 | GET | `/hr/employees/:employeeId/bonuses` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L11) |
| 152 | GET | `/hr/bonuses/:id` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L11) |
| 153 | GET | `/hr/bonuses` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L12) |
| 154 | POST | `/hr/employees/:employeeId/bonuses` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L14) |
| 155 | PATCH | `/hr/bonuses/:id` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L15) |
| 156 | POST | `/hr/bonuses/:id/submit` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L16) |
| 157 | POST | `/hr/bonuses/:id/approve` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L17) |
| 158 | POST | `/hr/bonuses/:id/reject` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L17) |
| 159 | POST | `/hr/bonuses/:id/cancel` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-bonus.routes.ts#L18) |
| 160 | GET | `/hr/contract-types` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L34) |
| 161 | POST | `/hr/contract-types` | hr | `hr.contract.type.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L35) |
| 162 | PATCH | `/hr/contract-types/:id` | hr | `hr.contract.type.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L36) |
| 163 | GET | `/hr/employees/:employeeId/contracts` | hr | `hr.contract.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L38) |
| 164 | GET | `/hr/contracts/:id` | hr | `hr.contract.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L39) |
| 165 | POST | `/hr/employees/:employeeId/contracts` | hr | `hr.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L40) |
| 166 | PATCH | `/hr/contracts/:id` | hr | `hr.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L41) |
| 167 | POST | `/hr/contracts/:id/activate` | hr | `hr.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L42) |
| 168 | POST | `/hr/contracts/:id/end` | hr | `hr.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L43) |
| 169 | POST | `/hr/contracts/:id/cancel` | hr | `hr.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L44) |
| 170 | POST | `/hr/contracts/:id/renew` | hr | `hr.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-contract.routes.ts#L45) |
| 171 | GET | `/hr/leave-types` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L12) |
| 172 | POST | `/hr/leave-types` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L13) |
| 173 | PATCH | `/hr/leave-types/:id` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L14) |
| 174 | GET | `/hr/employees/:employeeId/leaves` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L16) |
| 175 | GET | `/hr/leaves` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L17) |
| 176 | POST | `/hr/employees/:employeeId/leaves` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L19) |
| 177 | PATCH | `/hr/leaves/:id` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L20) |
| 178 | POST | `/hr/leaves/:id/submit` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L21) |
| 179 | POST | `/hr/leaves/:id/approve` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L23) |
| 180 | POST | `/hr/leaves/:id/reject` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L23) |
| 181 | POST | `/hr/leaves/:id/cancel` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr-leave.routes.ts#L24) |
| 182 | GET | `/hr/providers/:providerId/contracts` | hr | `hr.provider.contract.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L35) |
| 183 | GET | `/hr/provider-contracts/:id` | hr | `hr.provider.contract.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L36) |
| 184 | GET | `/hr/provider-contracts/:id/history` | hr | `hr.provider.contract.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L37) |
| 185 | POST | `/hr/providers/:providerId/contracts` | hr | `hr.provider.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L39) |
| 186 | PATCH | `/hr/provider-contracts/:id` | hr | `hr.provider.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L41) |
| 187 | PUT | `/hr/provider-contracts/:id/requirements` | hr | `hr.provider.contract.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-contract.routes.ts#L45) |
| 188 | GET | `/hr/provider-remunerations` | hr | `hr.provider.remuneration.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L14) |
| 189 | GET | `/hr/provider-remunerations/contracts` | hr | `hr.provider.remuneration.prepare` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L15) |
| 190 | GET | `/hr/provider-remunerations/:id/history` | hr | `hr.provider.remuneration.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L16) |
| 191 | POST | `/hr/provider-remunerations` | hr | `hr.provider.remuneration.prepare` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L18) |
| 192 | POST | `/hr/provider-remunerations/:id/submit` | hr | `hr.provider.remuneration.submit` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L20) |
| 193 | POST | `/hr/provider-remunerations/:id/validate` | hr | `hr.provider.remuneration.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L22) |
| 194 | POST | `/hr/provider-remunerations/:id/reject` | hr | `hr.provider.remuneration.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L23) |
| 195 | POST | `/hr/provider-remunerations/:id/cancel` | hr | `hr.provider.remuneration.prepare` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L24) |
| 196 | GET | `/hr/providers/:providerId/payment-instruments` | hr | `hr.provider.remuneration.disburse` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L26) |
| 197 | POST | `/hr/providers/:providerId/payment-instruments` | hr | `hr.provider.payment_method.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L27) |
| 198 | POST | `/hr/provider-remunerations/:id/finance-request` | hr | `hr.provider.remuneration.finance.request` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L30) |
| 199 | POST | `/hr/provider-remunerations/:id/disburse` | hr | `hr.provider.remuneration.disburse` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L32) |
| 200 | POST | `/hr/provider-remunerations/:id/document-exceptions` | hr | `hr.provider.remuneration.finance.request` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L34) |
| 201 | POST | `/hr/provider-remunerations/:id/document-exceptions/:typeId/approve` | hr | `hr.provider.document_exception.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L35) |
| 202 | POST | `/hr/provider-remunerations/:id/document-exceptions/:typeId/reject` | hr | `hr.provider.document_exception.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider-remuneration.routes.ts#L36) |
| 203 | GET | `/hr/personnel` | hr | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L28) |
| 204 | GET | `/hr/provider-identities/matches` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L30) |
| 205 | POST | `/hr/providers` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L32) |
| 206 | GET | `/hr/providers/:id` | hr | `hr.providers.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L34) |
| 207 | PATCH | `/hr/providers/:id` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L35) |
| 208 | POST | `/hr/providers/:id/suspend` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L36) |
| 209 | POST | `/hr/providers/:id/reactivate` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L37) |
| 210 | GET | `/hr/providers/:id/assignments` | hr | `hr.providers.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L38) |
| 211 | POST | `/hr/providers/:id/assignments` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L39) |
| 212 | POST | `/hr/providers/:id/assignments/:assignmentId/suspend` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L41) |
| 213 | POST | `/hr/providers/:id/assignments/:assignmentId/reactivate` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L42) |
| 214 | GET | `/hr/providers/:id/media` | hr | `hr.providers.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L43) |
| 215 | POST | `/hr/providers/:id/media` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L44) |
| 216 | DELETE | `/hr/providers/:id/media` | hr | `hr.providers.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-provider.routes.ts#L45) |
| 217 | GET | `/hr/remunerations` | hr | `hr.remuneration.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L14) |
| 218 | GET | `/hr/remunerations/agencies/options` | hr | `hr.remuneration.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L15) |
| 219 | GET | `/hr/remunerations/:id/history` | hr | `hr.remuneration.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L16) |
| 220 | GET | `/hr/remunerations/:id/compatible-budgets` | hr | `hr.remuneration.engage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L17) |
| 221 | POST | `/hr/remunerations/prepare` | hr | `hr.remuneration.prepare` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L18) |
| 222 | PATCH | `/hr/remunerations/:id` | hr | `hr.remuneration.prepare` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L19) |
| 223 | POST | `/hr/remunerations/:id/submit` | hr | `hr.remuneration.submit` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L20) |
| 224 | POST | `/hr/remunerations/:id/validate` | hr | `hr.remuneration.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L22) |
| 225 | POST | `/hr/remunerations/:id/reject` | hr | `hr.remuneration.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L22) |
| 226 | POST | `/hr/remunerations/:id/engage` | hr | `hr.remuneration.engage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L23) |
| 227 | POST | `/hr/remunerations/:id/payments` | hr | `hr.remuneration.pay` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr-remuneration.routes.ts#L24) |
| 228 | GET | `/hr/employees` | hr | `hr.employees.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L387) |
| 229 | POST | `/hr/employees` | hr | `hr.employees.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L462) |
| 230 | GET | `/hr/employees/eligible-users` | hr | `hr.employee.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L533) |
| 231 | GET | `/hr/employees/:id` | hr | `hr.employees.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L563) |
| 232 | GET | `/hr/employees/:id/photo` | hr | `hr.employees.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L573) |
| 233 | POST | `/hr/employees/:id/photo` | hr | `hr.employees.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L586) |
| 234 | DELETE | `/hr/employees/:id/photo` | hr | `hr.employees.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L611) |
| 235 | GET | `/hr/employees/:id/pdf` | hr | `hr.employees.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L628) |
| 236 | POST | `/hr/employees/:id/link-user` | hr | `hr.employee.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L681) |
| 237 | POST | `/hr/employees/:id/unlink-user` | hr | `hr.employee.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L737) |
| 238 | PATCH | `/hr/employees/:id` | hr | `hr.employees.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L768) |
| 239 | GET | `/hr/employees/:id/salaries` | hr | `hr.salary.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L832) |
| 240 | POST | `/hr/employees/:id/salaries` | hr | `hr.salary.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L847) |
| 241 | GET | `/hr/stock-agencies` | hr | `hr.stock.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L882) |
| 242 | GET | `/hr/stock-concessions` | hr | `hr.stock.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L901) |
| 243 | GET | `/hr/internal-stock-categories` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L918) |
| 244 | POST | `/hr/internal-stock-categories` | hr | `hr.stock.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L953) |
| 245 | PATCH | `/hr/internal-stock-categories/:id` | hr | `hr.stock.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L990) |
| 246 | GET | `/hr/internal-stock` | hr | `hr.stock.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1049) |
| 247 | POST | `/hr/internal-stock` | hr | `hr.stock.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1086) |
| 248 | PATCH | `/hr/internal-stock/:id/minimum-threshold` | hr | `hr.stock.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1135) |
| 249 | PATCH | `/hr/internal-stock/:id/status` | hr | `hr.stock.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1162) |
| 250 | GET | `/hr/internal-stock/:id/movements` | hr | `hr.stock.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1191) |
| 251 | POST | `/hr/internal-stock/:id/movements` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1214) |
| 252 | GET | `/hr/budget-categories` | hr | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1268) |
| 253 | GET | `/hr/budget-category-concessions` | hr | `hr.budget.category.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1319) |
| 254 | POST | `/hr/budget-categories` | hr | `hr.budget.category.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1336) |
| 255 | PATCH | `/hr/budget-categories/:id` | hr | `hr.budget.category.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1379) |
| 256 | PATCH | `/hr/budget-categories/:id/status` | hr | `hr.budget.category.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1438) |
| 257 | GET | `/hr/budgets` | hr | `hr.budget.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1484) |
| 258 | GET | `/hr/budget-targets` | hr | `hr.budget.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1536) |
| 259 | GET | `/hr/concessions` | hr | `hr.budget.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1581) |
| 260 | POST | `/hr/budgets` | hr | `hr.budget.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1594) |
| 261 | POST | `/hr/budgets/:id/submit` | hr | `hr.budget.submit` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1681) |
| 262 | PATCH | `/hr/budgets/:id` | hr | `hr.budget.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1714) |
| 263 | POST | `/hr/budgets/:id/approve` | hr | `hr.budget.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1715) |
| 264 | POST | `/hr/budgets/:id/reject` | hr | `hr.budget.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1750) |
| 265 | POST | `/hr/budgets/:id/reopen` | hr | `hr.budget.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1784) |
| 266 | POST | `/hr/budgets/:id/cancel` | hr | `hr.budget.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1814) |
| 267 | POST | `/hr/budgets/:id/close` | hr | `hr.budget.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1855) |
| 268 | GET | `/hr/budgets/:id/approval-history` | hr | `hr.approval.history.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1917) |
| 269 | GET | `/hr/budgets/:id/funds` | hr | `hr.budget.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1936) |
| 270 | POST | `/hr/budgets/:id/funds` | hr | `hr.budget.fund.request` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1956) |
| 271 | GET | `/hr/budget-fund-requests` | hr | `hr.budget.fund.request.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1994) |
| 272 | POST | `/hr/budget-fund-requests/:id/approve` | hr | `hr.budget.fund.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1995) |
| 273 | POST | `/hr/budget-fund-requests/:id/reject` | hr | `hr.budget.fund.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1996) |
| 274 | GET | `/hr/expenses` | hr | `hr.expense.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L1997) |
| 275 | GET | `/hr/budgets/:id/expenses` | hr | `hr.expense.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2011) |
| 276 | POST | `/hr/budgets/:id/expenses` | hr | `hr.expense.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2060) |
| 277 | POST | `/hr/expenses/:id/submit` | hr | `hr.expense.submit` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2127) |
| 278 | POST | `/hr/expenses/:id/approve` | hr | `hr.expense.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2165) |
| 279 | POST | `/hr/expenses/:id/reject` | hr | `hr.expense.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2230) |
| 280 | POST | `/hr/expenses/:id/cancel` | hr | `hr.expense.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2277) |
| 281 | GET | `/hr/overview` | hr | `hr.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2355) |
| 282 | GET | `/hr/reporting` | hr | `hr.reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2455) |
| 283 | PATCH | `/hr/expenses/:id` | hr | `hr.expense.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/hr/hr.routes.ts#L2602) |
| 284 | GET | `/notifications` | notifications | `notifications.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L34) |
| 285 | GET | `/notifications/unread-count` | notifications | `notifications.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L50) |
| 286 | PATCH | `/notifications/read-all` | notifications | `notifications.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L52) |
| 287 | PATCH | `/notifications/:id/read` | notifications | `notifications.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L67) |
| 288 | PATCH | `/notifications/:id/archive` | notifications | `notifications.archive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L68) |
| 289 | DELETE | `/notifications/:id` | notifications | `notifications.delete` | Métier déjà migré | Migré | [source](../backend-node/src/modules/notifications/notification.routes.ts#L69) |
| 290 | GET | `/part-direct-purchases` | parts | `parts.direct_purchase.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L18) |
| 291 | GET | `/part-direct-purchases/:id` | parts | `parts.direct_purchase.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L24) |
| 292 | POST | `/part-direct-purchases` | parts | `parts.direct_purchase.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L30) |
| 293 | POST | `/part-direct-purchases/:id/receipts` | parts | `parts.direct_purchase.receive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L37) |
| 294 | POST | `/part-direct-purchases/:id/settlements` | parts | `parts.direct_purchase.settle` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/direct-purchases.routes.ts#L42) |
| 295 | GET | `/parts-internal-requests` | parts | `parts.internal_request.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L28) |
| 296 | GET | `/parts-internal-requests/:id` | parts | `parts.internal_request.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L30) |
| 297 | POST | `/parts-internal-requests/:id/deliveries` | parts | `parts.internal_delivery.dispatch` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L32) |
| 298 | POST | `/parts-internal-deliveries/:id/receive` | parts | `service.parts.receive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L34) |
| 299 | POST | `/parts-internal-delivery-items/:id/returns` | parts | `service.parts.return` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L36) |
| 300 | POST | `/parts-internal-returns/:id/receive` | parts | `parts.return.receive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/internal-logistics.routes.ts#L38) |
| 301 | GET | `/part-sales` | parts | `parts.sale.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L4) |
| 302 | GET | `/part-sales/:id` | parts | `parts.sale.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L5) |
| 303 | POST | `/part-sales` | parts | `parts.sale.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L6) |
| 304 | POST | `/part-sales/:id/release` | parts | `parts.sale.release` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L7) |
| 305 | POST | `/part-sale-items/:id/returns` | parts | `parts.sale.return` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L8) |
| 306 | POST | `/part-sale-returns/:id/decide` | parts | `parts.sale.return_decide` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part-sales.routes.ts#L9) |
| 307 | GET | `/part-references` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L48) |
| 308 | GET | `/part-categories` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L49) |
| 309 | POST | `/part-categories` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L50) |
| 310 | PATCH | `/part-categories/:id` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L51) |
| 311 | GET | `/part-locations/agencies` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L56) |
| 312 | GET | `/part-locations` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L63) |
| 313 | POST | `/part-locations` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L68) |
| 314 | PATCH | `/part-locations/:id` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L78) |
| 315 | GET | `/suppliers` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L97) |
| 316 | GET | `/suppliers/:id` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L98) |
| 317 | POST | `/suppliers` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L100) |
| 318 | PATCH | `/suppliers/:id` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L101) |
| 319 | PATCH | `/suppliers/:id/status` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L102) |
| 320 | GET | `/parts` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L105) |
| 321 | GET | `/parts` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L123) |
| 322 | GET | `/parts/:id` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L124) |
| 323 | GET | `/parts/:id/movements` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L125) |
| 324 | POST | `/parts` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L126) |
| 325 | PATCH | `/parts/:id` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L127) |
| 326 | POST | `/parts/:id/inventory-count` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L128) |
| 327 | POST | `/parts/:id/adjustments` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L129) |
| 328 | POST | `/parts/:id/returns` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L130) |
| 329 | POST | `/parts/:id/transfers` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L131) |
| 330 | POST | `/parts/:id/movements` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L132) |
| 331 | GET | `/purchase-orders` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L135) |
| 332 | GET | `/purchase-orders/:id` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L136) |
| 333 | POST | `/purchase-orders` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L137) |
| 334 | PATCH | `/purchase-orders/:id` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L138) |
| 335 | POST | `/purchase-orders/:id/items` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L139) |
| 336 | PATCH | `/purchase-orders/:id/items/:itemId` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L140) |
| 337 | PATCH | `/purchase-orders/:id/status` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L141) |
| 338 | POST | `/purchase-orders/:id/receipts` | parts | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/part.routes.ts#L142) |
| 339 | GET | `/supplier-invoices` | parts | `supplier.invoice.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L32) |
| 340 | GET | `/supplier-invoices/indicators` | parts | `supplier.debt.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L33) |
| 341 | GET | `/supplier-invoices/options` | parts | `supplier.invoice.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L34) |
| 342 | POST | `/supplier-invoices` | parts | `supplier.invoice.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L35) |
| 343 | GET | `/supplier-invoices/:id` | parts | `supplier.invoice.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L36) |
| 344 | PATCH | `/supplier-invoices/:id` | parts | `supplier.invoice.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L37) |
| 345 | POST | `/supplier-invoices/:id/budget-link` | parts | `hr.expense.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L42) |
| 346 | POST | `/supplier-invoices/:id/payments` | parts | `supplier.payment.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L43) |
| 347 | POST | `/supplier-invoices/:id/credits` | parts | `supplier.credit.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L45) |
| 348 | POST | `/supplier-credits/:id/submit` | parts | `supplier.credit.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L46) |
| 349 | POST | `/supplier-credits/:id/validate` | parts | `supplier.credit.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L48) |
| 350 | POST | `/supplier-credits/:id/reject` | parts | `supplier.credit.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L49) |
| 351 | GET | `/supplier-invoices/:id/history` | parts | `supplier.invoice.history.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/parts/supplier-finance.routes.ts#L50) |
| 352 | GET | `/proformas` | proformas | `proformas.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L60) |
| 353 | GET | `/proformas/:id` | proformas | `proformas.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L61) |
| 354 | GET | `/proformas/:id/pdf` | proformas | `proformas.export` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L62) |
| 355 | POST | `/proformas` | proformas | `proformas.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L64) |
| 356 | PATCH | `/proformas/:id` | proformas | `proformas.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L66) |
| 357 | POST | `/proformas/:id/issue` | proformas | `proformas.issue` | Métier déjà migré | Migré | [source](../backend-node/src/modules/proformas/proforma.routes.ts#L68) |
| 358 | GET | `/quotations/config` | quotations | `quotations.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L10) |
| 359 | GET | `/quotations` | quotations | `quotations.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L11) |
| 360 | GET | `/quotations/opportunity/:opportunityId` | quotations | `quotations.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L12) |
| 361 | GET | `/quotations/opportunity/:opportunityId/vehicle-context` | quotations | `quotations.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L13) |
| 362 | GET | `/quotations/:id/pdf` | quotations | `quotations.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L14) |
| 363 | GET | `/quotations/:id` | quotations | `quotations.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L15) |
| 364 | POST | `/quotations` | quotations | `quotations.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L16) |
| 365 | PATCH | `/quotations/:id` | quotations | `quotations.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L17) |
| 366 | POST | `/quotations/:id/validate` | quotations | `quotations.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L18) |
| 367 | POST | `/quotations/:id/archive` | quotations | `quotations.validate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L19) |
| 368 | POST | `/quotations/:id/cancel` | quotations | `quotations.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/quotations/quotation.routes.ts#L20) |
| 369 | GET | `/rbac/agencies` | rbac | `—` | Fonction technique | Socle validé | [source](../backend-node/src/modules/rbac/agency-rbac.routes.ts#L7) |
| 370 | GET | `/rbac/agency-context` | rbac | `—` | Fonction technique | Socle validé | [source](../backend-node/src/modules/rbac/agency-rbac.routes.ts#L8) |
| 371 | PUT | `/rbac/agency-context` | rbac | `—` | Fonction technique | Socle validé | [source](../backend-node/src/modules/rbac/agency-rbac.routes.ts#L9) |
| 372 | GET | `/reports/consolidated/commercial` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L21) |
| 373 | GET | `/reports/consolidated/treasury` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L27) |
| 374 | GET | `/reports/consolidated/budgets` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L29) |
| 375 | GET | `/reports/consolidated/hr` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L31) |
| 376 | GET | `/reports/consolidated/activity` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L38) |
| 377 | GET | `/reports/consolidated/returns` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/extended-report.routes.ts#L40) |
| 378 | GET | `/reports/financial/:section` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/financial-report.routes.ts#L4) |
| 379 | GET | `/reports/financial-export/:section` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/financial-report.routes.ts#L5) |
| 380 | GET | `/reports/margin-provenance` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L7) |
| 381 | GET | `/reports/overview` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L21) |
| 382 | GET | `/reports/revenue` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L22) |
| 383 | GET | `/reports/sales` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L23) |
| 384 | GET | `/reports/salespeople` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L24) |
| 385 | GET | `/reports/vehicles` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L25) |
| 386 | GET | `/reports/workshop` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L26) |
| 387 | GET | `/reports/warranties` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L27) |
| 388 | GET | `/reports/parts` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L28) |
| 389 | GET | `/reports/finance` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L29) |
| 390 | GET | `/reports/agencies` | reports | `reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L30) |
| 391 | GET | `/reports/export` | reports | `reporting.export, reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/reports/report.routes.ts#L31) |
| 392 | GET | `/sales` | sales | `sales.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L8) |
| 393 | GET | `/sales/config/direct-tax` | sales | `sales.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L9) |
| 394 | GET | `/sales/:id` | sales | `sales.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L10) |
| 395 | GET | `/vehicles/:id/warranty-proposal` | sales | `sales.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L11) |
| 396 | GET | `/sales/vehicles/:id/pricing-guard` | sales | `sales.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L12) |
| 397 | POST | `/sales` | sales | `sales.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L13) |
| 398 | PATCH | `/sales/:id` | sales | `sales.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L14) |
| 399 | PATCH | `/sales/:id/warranty` | sales | `sales.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L15) |
| 400 | PATCH | `/sales/:id/status` | sales | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L16) |
| 401 | POST | `/sales/:id/archive` | sales | `sales.confirm` | Métier déjà migré | Migré | [source](../backend-node/src/modules/sales/sale.routes.ts#L21) |
| 402 | GET | `/settings` | settings | `settings.general.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L6) |
| 403 | PUT | `/settings` | settings | `settings.general.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L7) |
| 404 | GET | `/concessions/current` | settings | `settings.general.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L8) |
| 405 | PATCH | `/concessions/current` | settings | `settings.general.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L9) |
| 406 | PUT | `/concessions/current/document-logo` | settings | `settings.general.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L10) |
| 407 | DELETE | `/concessions/current/document-logo` | settings | `settings.general.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L11) |
| 408 | GET | `/agencies` | settings | `—` | Contrôle effectif dans le service | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L12) |
| 409 | GET | `/settings/agencies` | settings | `settings.agencies.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L13) |
| 410 | POST | `/agencies` | settings | `settings.agencies.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L14) |
| 411 | PATCH | `/agencies/:id` | settings | `settings.agencies.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L15) |
| 412 | PATCH | `/agencies/:id/status` | settings | `settings.agencies.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L16) |
| 413 | GET | `/workshop-labor-rates` | settings | `settings.workshop_rates.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L17) |
| 414 | POST | `/workshop-labor-rates` | settings | `settings.workshop_rates.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L18) |
| 415 | PATCH | `/workshop-labor-rates/:id` | settings | `settings.workshop_rates.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L19) |
| 416 | PUT | `/workshop-labor-rates/:id/agency-override` | settings | `settings.workshop_rates.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L20) |
| 417 | DELETE | `/workshop-labor-rates/:id/agency-override` | settings | `settings.workshop_rates.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L21) |
| 418 | GET | `/settings/manufacturers` | settings | `settings.manufacturers.view` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L22) |
| 419 | POST | `/settings/manufacturers` | settings | `settings.manufacturers.create` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L23) |
| 420 | PATCH | `/settings/manufacturers/:id` | settings | `settings.manufacturers.update` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L24) |
| 421 | PATCH | `/settings/manufacturers/:id/status` | settings | `settings.manufacturers.disable` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L25) |
| 422 | GET | `/settings/document-references` | settings | `settings.documents.view` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L26) |
| 423 | POST | `/settings/document-categories` | settings | `settings.documents.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L27) |
| 424 | PATCH | `/settings/document-categories/:id` | settings | `settings.documents.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L28) |
| 425 | POST | `/settings/document-types` | settings | `settings.documents.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L29) |
| 426 | PATCH | `/settings/document-types/:id` | settings | `settings.documents.manage` | Administration centrale | Migré | [source](../backend-node/src/modules/settings/setting.routes.ts#L30) |
| 427 | PATCH | `/showroom/test-drives/:id/schedule` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L48) |
| 428 | PATCH | `/showroom/test-drives/:id/start` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L50) |
| 429 | PATCH | `/showroom/test-drives/:id/cancel` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L52) |
| 430 | GET | `/showroom/agencies/visitor-create` | showroom | `showroom.visitor.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L54) |
| 431 | GET | `/showroom/agencies/:agencyId/sales-candidates` | showroom | `showroom.assign` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L55) |
| 432 | GET | `/showroom/detect` | showroom | `showroom.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L57) |
| 433 | GET | `/showroom` | showroom | `showroom.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L59) |
| 434 | GET | `/showroom/test-drive-config` | showroom | `showroom.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L61) |
| 435 | GET | `/showroom/:id` | showroom | `showroom.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L63) |
| 436 | POST | `/showroom/crm/leads/:leadId/test-drives` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L65) |
| 437 | POST | `/showroom` | showroom | `showroom.visitor.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L96) |
| 438 | PATCH | `/showroom/:id/assign` | showroom | `showroom.assign` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L98) |
| 439 | PATCH | `/showroom/:id/take-over` | showroom | `showroom.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L100) |
| 440 | PATCH | `/showroom/:id/complete` | showroom | `showroom.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L102) |
| 441 | PATCH | `/showroom/:id/cancel` | showroom | `showroom.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L104) |
| 442 | POST | `/showroom/:id/test-drives` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L106) |
| 443 | PATCH | `/showroom/test-drives/:id/complete` | showroom | `showroom.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L130) |
| 444 | POST | `/showroom/:id/convert-to-lead` | showroom | `showroom.visitor.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/showroom/showroom.routes.ts#L132) |
| 445 | GET | `/treasury/bank-statements` | treasury | `treasury.reconciliation.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L3) |
| 446 | POST | `/treasury/bank-statements/preview` | treasury | `treasury.reconciliation.import` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L4) |
| 447 | GET | `/treasury/bank-statements/:id` | treasury | `treasury.reconciliation.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L5) |
| 448 | POST | `/treasury/bank-statements/:id/validate` | treasury | `treasury.reconciliation.validate_import` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L6) |
| 449 | POST | `/treasury/bank-statements/:id/reject` | treasury | `treasury.reconciliation.validate_import` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L7) |
| 450 | POST | `/treasury/bank-statements/:id/cancel` | treasury | `treasury.reconciliation.validate_import` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L8) |
| 451 | GET | `/treasury/bank-statements/:id/history` | treasury | `treasury.reconciliation.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L9) |
| 452 | GET | `/treasury/bank-statement-lines/:id/proposals` | treasury | `treasury.reconciliation.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L10) |
| 453 | POST | `/treasury/bank-reconciliations` | treasury | `treasury.reconciliation.reconcile` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L11) |
| 454 | POST | `/treasury/bank-reconciliations/:id/cancel` | treasury | `treasury.reconciliation.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L12) |
| 455 | GET | `/treasury/bank-unmatched` | treasury | `treasury.reconciliation.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L13) |
| 456 | GET | `/treasury/bank-statements/:id/export` | treasury | `treasury.reconciliation.export` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/bank-reconciliation.routes.ts#L14) |
| 457 | GET | `/treasury/accounts` | treasury | `treasury.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L9) |
| 458 | GET | `/treasury/account-territories` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L14) |
| 459 | GET | `/treasury/accounts/:id` | treasury | `treasury.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L19) |
| 460 | POST | `/treasury/accounts` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L24) |
| 461 | PATCH | `/treasury/accounts/:id` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L31) |
| 462 | PATCH | `/treasury/accounts/:id/status` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L38) |
| 463 | GET | `/treasury/categories` | treasury | `treasury.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L45) |
| 464 | POST | `/treasury/categories` | treasury | `treasury.category.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L50) |
| 465 | PATCH | `/treasury/categories/:id` | treasury | `treasury.category.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L57) |
| 466 | PATCH | `/treasury/categories/:id/status` | treasury | `treasury.category.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L64) |
| 467 | GET | `/treasury/journal` | treasury | `treasury.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L71) |
| 468 | GET | `/treasury/journal/export` | treasury | `treasury.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L76) |
| 469 | GET | `/treasury/journal/:id` | treasury | `treasury.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L141) |
| 470 | GET | `/treasury/summary` | treasury | `treasury.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L146) |
| 471 | GET | `/treasury/coverage` | treasury | `treasury.coverage.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L151) |
| 472 | GET | `/treasury/budget-indicators` | treasury | `treasury.coverage.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L156) |
| 473 | GET | `/treasury/reservations` | treasury | `treasury.reservation.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L161) |
| 474 | GET | `/treasury/reservation-expenses` | treasury | `treasury.reservation.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L166) |
| 475 | POST | `/treasury/reservations` | treasury | `treasury.reservation.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L167) |
| 476 | POST | `/treasury/reservations/:id/submit` | treasury | `treasury.reservation.submit` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L174) |
| 477 | POST | `/treasury/reservations/:id/approve` | treasury | `treasury.reservation.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L175) |
| 478 | POST | `/treasury/reservations/:id/reject` | treasury | `treasury.reservation.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L176) |
| 479 | POST | `/treasury/reservations/:id/cancel` | treasury | `treasury.reservation.cancel` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L177) |
| 480 | POST | `/treasury/reservations/:id/expire` | treasury | `treasury.reservation.expire` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L178) |
| 481 | PATCH | `/treasury/reservations/:id` | treasury | `treasury.reservation.adjust` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L179) |
| 482 | POST | `/treasury/reservations/:id/release` | treasury | `treasury.reservation.release` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L186) |
| 483 | GET | `/treasury/reservations/:id/history` | treasury | `treasury.reservation.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L193) |
| 484 | GET | `/treasury/manual-options` | treasury | `treasury.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L200) |
| 485 | POST | `/treasury/transfers` | treasury | `treasury.transfer.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L205) |
| 486 | POST | `/treasury/manual-receipts` | treasury | `treasury.receipt.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L212) |
| 487 | POST | `/treasury/manual-disbursements` | treasury | `treasury.disbursement.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L219) |
| 488 | GET | `/hr/budget-expenses/:id/disbursements` | treasury | `hr.expense.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L226) |
| 489 | POST | `/hr/budget-expenses/:id/disbursements` | treasury | `hr.expense.disburse` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L233) |
| 490 | POST | `/treasury/movements/:id/reversal` | treasury | `treasury.reverse` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L241) |
| 491 | GET | `/treasury/flow-configuration` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L248) |
| 492 | PUT | `/treasury/flow-mappings` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L253) |
| 493 | PATCH | `/treasury/flow-mappings/:id` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L258) |
| 494 | PATCH | `/treasury/flow-mappings/:id/status` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L265) |
| 495 | DELETE | `/treasury/flow-mappings/:id` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L272) |
| 496 | PATCH | `/treasury/flow-readiness` | treasury | `treasury.account.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/treasury/treasury.routes.ts#L279) |
| 497 | GET | `/users/directory` | users | `—` | Contrôle effectif dans le service | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L14) |
| 498 | GET | `/users/me` | users | `—` | Fonction personnelle | Conservé | [source](../backend-node/src/modules/users/user.routes.ts#L15) |
| 499 | PATCH | `/users/me` | users | `—` | Fonction personnelle | Conservé | [source](../backend-node/src/modules/users/user.routes.ts#L16) |
| 500 | PATCH | `/users/me/password` | users | `—` | Fonction personnelle | Conservé | [source](../backend-node/src/modules/users/user.routes.ts#L17) |
| 501 | POST | `/users/me/avatar` | users | `—` | Fonction personnelle | Conservé | [source](../backend-node/src/modules/users/user.routes.ts#L18) |
| 502 | DELETE | `/users/me/avatar` | users | `—` | Fonction personnelle | Conservé | [source](../backend-node/src/modules/users/user.routes.ts#L19) |
| 503 | GET | `/users` | users | `users.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L20) |
| 504 | GET | `/users/:id` | users | `users.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L21) |
| 505 | POST | `/users` | users | `users.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L22) |
| 506 | PATCH | `/users/:id` | users | `users.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L23) |
| 507 | PATCH | `/users/:id/status` | users | `users.disable` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L24) |
| 508 | PATCH | `/users/:id/password` | users | `users.reset_password` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L25) |
| 509 | POST | `/users/:id/avatar` | users | `users.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L26) |
| 510 | DELETE | `/users/:id/avatar` | users | `users.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L27) |
| 511 | GET | `/users/:id/agencies` | users | `users.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L28) |
| 512 | POST | `/users/:id/agencies` | users | `users.assign_agency` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L29) |
| 513 | PATCH | `/users/:id/agencies/:assignmentId/status` | users | `users.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L30) |
| 514 | PATCH | `/users/:id/agencies/:assignmentId/primary` | users | `users.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L31) |
| 515 | POST | `/users/:id/agencies/:assignmentId/roles` | users | `users.assign_role` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L32) |
| 516 | DELETE | `/users/:id/agencies/:assignmentId/roles/:roleId` | users | `users.assign_role` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L33) |
| 517 | GET | `/permissions` | users | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L34) |
| 518 | GET | `/roles` | users | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L35) |
| 519 | GET | `/roles/:id/permissions` | users | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L36) |
| 520 | POST | `/roles` | users | `roles.create` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L37) |
| 521 | PATCH | `/roles/:id` | users | `roles.update` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L38) |
| 522 | PATCH | `/roles/:id/status` | users | `roles.disable` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L39) |
| 523 | DELETE | `/roles/:id` | users | `roles.delete` | Administration centrale | Migré | [source](../backend-node/src/modules/users/user.routes.ts#L40) |
| 524 | GET | `/vehicle-returns` | vehicle-returns | `vehicle.return.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L32) |
| 525 | GET | `/vehicle-returns/:id` | vehicle-returns | `vehicle.return.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L33) |
| 526 | GET | `/vehicle-returns/:id/options` | vehicle-returns | `vehicle.return.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L34) |
| 527 | POST | `/vehicle-returns` | vehicle-returns | `vehicle.return.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L36) |
| 528 | POST | `/vehicle-returns/:id/inspection` | vehicle-returns | `vehicle.return.inspect` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L38) |
| 529 | POST | `/vehicle-returns/:id/approve` | vehicle-returns | `vehicle.return.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L41) |
| 530 | POST | `/vehicle-returns/:id/reject` | vehicle-returns | `vehicle.return.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L42) |
| 531 | POST | `/vehicle-returns/:id/deductions` | vehicle-returns | `vehicle.return.financial.resolve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L44) |
| 532 | DELETE | `/vehicle-returns/:id/deductions/:deductionId` | vehicle-returns | `vehicle.return.financial.resolve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L45) |
| 533 | POST | `/vehicle-returns/:id/financial-resolution` | vehicle-returns | `vehicle.return.financial.resolve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L47) |
| 534 | POST | `/vehicle-returns/:id/receive` | vehicle-returns | `vehicle.return.stock.receive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L49) |
| 535 | POST | `/vehicle-returns/:id/stock-decision` | vehicle-returns | `vehicle.return.stock.receive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L51) |
| 536 | POST | `/vehicle-returns/:id/close` | vehicle-returns | `vehicle.return.stock.receive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L53) |
| 537 | POST | `/vehicle-returns/:id/archive` | vehicle-returns | `vehicle.return.stock.receive` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L54) |
| 538 | GET | `/vehicle-returns/:id/pdf` | vehicle-returns | `vehicle.return.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L55) |
| 539 | GET | `/vehicle-returns/:id/credit-notes/:creditNoteId/pdf` | vehicle-returns | `vehicle.return.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L56) |
| 540 | POST | `/vehicle-returns/:id/credit-notes/:creditNoteId/archive` | vehicle-returns | `vehicle.return.financial.resolve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts#L57) |
| 541 | GET | `/commercial-models` | vehicles | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L20) |
| 542 | GET | `/commercial-models/by-version/:versionId` | vehicles | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L21) |
| 543 | GET | `/commercial-models/by-version/:versionId/impact` | vehicles | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L22) |
| 544 | GET | `/commercial-models/:id` | vehicles | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L23) |
| 545 | GET | `/commercial-models/:id/impact` | vehicles | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L24) |
| 546 | POST | `/commercial-models` | vehicles | `vehicles.catalog.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L25) |
| 547 | PATCH | `/commercial-models/:id` | vehicles | `vehicles.catalog.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L26) |
| 548 | POST | `/commercial-models/:id/images` | vehicles | `vehicles.catalog.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L28) |
| 549 | PATCH | `/commercial-models/:id/images/:imageId/primary` | vehicles | `vehicles.catalog.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L29) |
| 550 | PATCH | `/commercial-models/:id/images/order` | vehicles | `vehicles.catalog.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L30) |
| 551 | DELETE | `/commercial-models/:id/images/:imageId` | vehicles | `vehicles.catalog.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/commercial-catalog.routes.ts#L31) |
| 552 | GET | `/vehicle-locations` | vehicles | `vehicles.assignments.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L43) |
| 553 | POST | `/vehicle-locations` | vehicles | `vehicles.assignments.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L50) |
| 554 | PATCH | `/vehicle-locations/:id` | vehicles | `vehicles.assignments.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L55) |
| 555 | GET | `/vehicle-transfer-agencies` | vehicles | `vehicles.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L60) |
| 556 | GET | `/vehicle-transfer-locations` | vehicles | `vehicles.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L65) |
| 557 | GET | `/vehicles/stats` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L83) |
| 558 | GET | `/vehicles/location-counts` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L90) |
| 559 | GET | `/vehicles/agencies/create` | vehicles | `vehicles.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L97) |
| 560 | GET | `/documents/business/vehicle/:id/pdf` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L125) |
| 561 | GET | `/vehicle-references` | vehicles | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L127) |
| 562 | GET | `/vehicles/warranty-providers/eligible` | vehicles | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L128) |
| 563 | GET | `/vehicles/filter-options` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L134) |
| 564 | GET | `/vehicles` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L149) |
| 565 | GET | `/vehicles/:id` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L166) |
| 566 | GET | `/vehicles/:id/360` | vehicles | `vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L173) |
| 567 | POST | `/vehicles` | vehicles | `vehicles.create` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L196) |
| 568 | PATCH | `/vehicles/:id` | vehicles | `vehicles.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L234) |
| 569 | PATCH | `/vehicles/:id/status` | vehicles | `vehicles.status.update` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L270) |
| 570 | POST | `/vehicles/:id/transfer` | vehicles | `vehicles.assign_agency` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L272) |
| 571 | POST | `/vehicles/:id/images` | vehicles | `vehicles.images.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L276) |
| 572 | PATCH | `/vehicles/:id/images/:imageId/primary` | vehicles | `vehicles.images.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L277) |
| 573 | DELETE | `/vehicles/:id/images/:imageId` | vehicles | `vehicles.images.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/vehicles/vehicle.routes.ts#L278) |
| 574 | GET | `/sav/invoices` | workshop | `service.billing.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L24) |
| 575 | GET | `/sav/transit/destinations` | workshop | `service.transit.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L39) |
| 576 | GET | `/sav/transit` | workshop | `service.transit.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L44) |
| 577 | POST | `/sav/transit` | workshop | `service.transit.initiate` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L50) |
| 578 | POST | `/sav/transit/:id/decision` | workshop | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L65) |
| 579 | POST | `/sav/transit/:id/cancel` | workshop | `service.transit.resolve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L70) |
| 580 | GET | `/sav/journal` | workshop | `service.journal.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L74) |
| 581 | GET | `/sav/reporting` | workshop | `service.reporting.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/sav-operations.routes.ts#L82) |
| 582 | GET | `/warranty-providers` | workshop | `service.order.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L11) |
| 583 | GET | `/repair-orders/:id/warranty` | workshop | `service.order.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L12) |
| 584 | PUT | `/repair-orders/:id/warranty` | workshop | `service.warranty.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L13) |
| 585 | POST | `/repair-orders/:id/warranty/decision` | workshop | `service.warranty.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L14) |
| 586 | PUT | `/repair-orders/:id/warranty/allocations` | workshop | `service.warranty.manage` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L15) |
| 587 | POST | `/repair-orders/:id/warranty/confirm` | workshop | `service.warranty.approve` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L16) |
| 588 | POST | `/warranty-claims/:id/payments` | workshop | `billing.payment.collect` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/warranty.routes.ts#L17) |
| 589 | GET | `/workshop/vehicles/search` | workshop | `workshop.vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L36) |
| 590 | POST | `/workshop/external-vehicles` | workshop | `workshop.external_vehicle.create, workshop.vehicle.associations.create, workshop.vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L54) |
| 591 | POST | `/workshop/vehicle-associations` | workshop | `workshop.vehicle.associations.create, workshop.vehicles.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L68) |
| 592 | GET | `/workshop/customers/:customerId/vehicle-associations` | workshop | `—` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L70) |
| 593 | PATCH | `/workshop/vehicle-associations/:id/close` | workshop | `workshop.vehicle.associations.close` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/workshop-vehicle.routes.ts#L76) |
| 594 | GET | `/workshop/config` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L171) |
| 595 | GET | `/repair-orders/:id/technician-candidates` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L388) |
| 596 | GET | `/repair-orders/:id/labor-rates` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L393) |
| 597 | GET | `/repair-orders/:id/available-parts` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L396) |
| 598 | GET | `/repair-orders/:id/available-parts/:partId/stocks` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L401) |
| 599 | GET | `/parts-work-queue` | workshop | `parts.reservation.view` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L406) |
| 600 | GET | `/parts-work-queue/:id` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L410) |
| 601 | GET | `/workshop/external-customers` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L416) |
| 602 | GET | `/workshop/external-customers/:customerId` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L424) |
| 603 | GET | `/repair-orders/advisor-candidates` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L432) |
| 604 | GET | `/repair-orders/customer-candidates` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L440) |
| 605 | GET | `/repair-orders/customer-vehicles` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L450) |
| 606 | GET | `/repair-orders` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L456) |
| 607 | GET | `/repair-orders/stats` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L482) |
| 608 | GET | `/repair-orders/:id` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L503) |
| 609 | GET | `/repair-orders/vehicles/:vehicleId/warranty-eligibility` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L508) |
| 610 | GET | `/repair-orders/:id/abandonment-impact` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L509) |
| 611 | POST | `/repair-orders/:id/abandonment` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L510) |
| 612 | POST | `/repair-orders/:id/abandonment/finalize` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L511) |
| 613 | POST | `/repair-orders/:id/abandonment/handover` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L512) |
| 614 | POST | `/repair-orders` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L513) |
| 615 | PATCH | `/repair-orders/:id/status` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L576) |
| 616 | POST | `/repair-orders/:id/inspection` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L643) |
| 617 | POST | `/repair-orders/:id/diagnostics` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L679) |
| 618 | POST | `/repair-orders/:id/estimate/issue` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L698) |
| 619 | PATCH | `/repair-orders/:id/tax-mode` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L705) |
| 620 | POST | `/repair-orders/:id/estimate-items` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L714) |
| 621 | DELETE | `/repair-orders/:id/estimate-items/:itemId` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L751) |
| 622 | POST | `/repair-orders/:id/approval` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L756) |
| 623 | POST | `/repair-orders/:id/estimate-supplements` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L785) |
| 624 | POST | `/repair-orders/:id/estimate-supplements/:supplementId/decision` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L792) |
| 625 | GET | `/service-appointments` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L797) |
| 626 | POST | `/service-appointments` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L805) |
| 627 | PATCH | `/service-appointments/:id/status` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L821) |
| 628 | POST | `/repair-orders/:id/items` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L833) |
| 629 | PATCH | `/repair-orders/:id/items/:itemId` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L906) |
| 630 | DELETE | `/repair-orders/:id/items/:itemId` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L907) |
| 631 | POST | `/repair-orders/:id/estimate-items/:estimateItemId/intervention` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L908) |
| 632 | POST | `/repair-orders/:id/interventions` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L924) |
| 633 | PATCH | `/repair-orders/:id/interventions/:interventionId/status` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L937) |
| 634 | POST | `/repair-orders/:id/estimate-items/:estimateItemId/reserve` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L948) |
| 635 | POST | `/repair-orders/:id/parts/reserve` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L970) |
| 636 | PATCH | `/repair-orders/:id/parts/reservations/:reservationId` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L992) |
| 637 | POST | `/repair-orders/:id/invoice` | workshop | `billing.invoice.create, billing.invoice.issue` | Métier déjà migré | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1024) |
| 638 | POST | `/repair-orders/:id/quality-control` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1061) |
| 639 | POST | `/repair-orders/:id/handover` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1077) |
| 640 | PATCH | `/repair-orders/:id/advisor` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1078) |
| 641 | POST | `/repair-orders/:id/assign` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1079) |
| 642 | GET | `/workshop/technicians` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1107) |
| 643 | GET | `/workshop/bays` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1120) |
| 644 | POST | `/workshop/bays` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1121) |
| 645 | PATCH | `/workshop/bays/:id` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1122) |
| 646 | POST | `/workshop/technicians` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1123) |
| 647 | PATCH | `/workshop/technicians/:id` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1124) |
| 648 | POST | `/workshop/technicians/:id/unavailability` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1125) |
| 649 | GET | `/workshop/unavailabilities` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1126) |
| 650 | DELETE | `/workshop/unavailabilities/:id` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1127) |
| 651 | GET | `/workshop/planning` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1128) |
| 652 | GET | `/workshop/interventions/history` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1142) |
| 653 | GET | `/workshop/stats` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1149) |
| 654 | PATCH | `/workshop/schedules/:id` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1150) |
| 655 | DELETE | `/workshop/schedules/:id` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1151) |
| 656 | POST | `/repair-orders/:id/sessions/start` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1152) |
| 657 | PATCH | `/repair-orders/:id/sessions/:sessionId/pause` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1160) |
| 658 | PATCH | `/repair-orders/:id/sessions/:sessionId/resume` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1161) |
| 659 | PATCH | `/repair-orders/:id/sessions/:sessionId/stop` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1162) |
| 660 | PATCH | `/workshop/time-entries/:id` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1172) |
| 661 | GET | `/repair-orders/:id/pdf` | workshop | `—` | Métier sous adaptateur restrictif et fraîcheur transactionnelle | Migré | [source](../backend-node/src/modules/workshop/workshop.routes.ts#L1173) |
| 662 | GET | `/api/health` | technique | `—` | Santé technique publique | Hors scope métier | [source](../backend-node/app.ts#L68) |
