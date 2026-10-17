# Annexe — Catalogue des routes API backend

Inventaire statique des 555 déclarations. Le préfixe public est `/api`; les routes du fichier `auth.routes.ts` sont montées sous `/api/auth`, les autres sous `/api`. Certaines déclarations dupliquées sont volontaires ou conditionnelles et doivent être revues au niveau du fichier.

## activity (5)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/activity/filters` | `backend-node/src/modules/activity/activity.routes.ts` |
| GET | `/activity/print/pdf` | `backend-node/src/modules/activity/activity.routes.ts` |
| GET | `/activity/:id/print/pdf` | `backend-node/src/modules/activity/activity.routes.ts` |
| GET | `/activity/:id` | `backend-node/src/modules/activity/activity.routes.ts` |
| GET | `/activity` | `backend-node/src/modules/activity/activity.routes.ts` |

## auth (28)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| POST | `/login` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/verify` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/recovery` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/challenge/setup` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/challenge/confirm` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/step-up` | `backend-node/src/modules/auth/auth.routes.ts` |
| GET | `/2fa/status` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/setup` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/confirm` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/disable` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/2fa/recovery/regenerate` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/refresh` | `backend-node/src/modules/auth/auth.routes.ts` |
| GET | `/me` | `backend-node/src/modules/auth/auth.routes.ts` |
| POST | `/logout` | `backend-node/src/modules/auth/auth.routes.ts` |
| GET | `/auth/2fa/users/:id` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| PATCH | `/auth/2fa/users/:id/requirement` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| POST | `/auth/2fa/users/:id/reset` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| GET | `/auth/2fa/role-policies` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| PUT | `/auth/2fa/role-policies/:id` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| GET | `/auth/2fa/security-settings` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| PUT | `/auth/2fa/security-settings` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| GET | `/auth/2fa/security-center/overview` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| GET | `/auth/2fa/security-center/users` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| GET | `/auth/2fa/devices/me` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| DELETE | `/auth/2fa/devices/me/current` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| DELETE | `/auth/2fa/devices/me/:id` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| GET | `/auth/2fa/devices` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |
| DELETE | `/auth/2fa/devices/:id` | `backend-node/src/modules/auth/two-factor-admin.routes.ts` |

## billing (17)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/invoices/payment-methods` | `backend-node/src/modules/billing/billing.routes.ts` |
| GET | `/billing/config` | `backend-node/src/modules/billing/billing.routes.ts` |
| GET | `/invoices/export/accounting` | `backend-node/src/modules/billing/billing.routes.ts` |
| GET | `/invoices` | `backend-node/src/modules/billing/billing.routes.ts` |
| GET | `/invoices/:id` | `backend-node/src/modules/billing/billing.routes.ts` |
| POST | `/invoices` | `backend-node/src/modules/billing/billing.routes.ts` |
| POST | `/invoices` | `backend-node/src/modules/billing/billing.routes.ts` |
| PATCH | `/invoices/:id` | `backend-node/src/modules/billing/billing.routes.ts` |
| PATCH | `/invoices/:id/status` | `backend-node/src/modules/billing/billing.routes.ts` |
| POST | `/invoices/:id/cancel` | `backend-node/src/modules/billing/billing.routes.ts` |
| GET | `/invoices/:id/payments` | `backend-node/src/modules/billing/billing.routes.ts` |
| POST | `/invoices/:id/payments` | `backend-node/src/modules/billing/billing.routes.ts` |
| GET | `/invoices/:id/credit-notes` | `backend-node/src/modules/billing/billing.routes.ts` |
| POST | `/invoices/:id/credit-notes` | `backend-node/src/modules/billing/billing.routes.ts` |
| POST | `/payments/:id/refund` | `backend-node/src/modules/billing/billing.routes.ts` |
| GET | `/invoices/:id/pdf` | `backend-node/src/modules/billing/billing.routes.ts` |
| GET | `/payments/:id/receipt` | `backend-node/src/modules/billing/billing.routes.ts` |

## core (1)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/documents/business/sale/:id/pdf` | `backend-node/src/modules/core/core.routes.ts` |

## crm (10)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/crm/team-members` | `backend-node/src/modules/crm/crm.routes.ts` |
| GET | `/leads/duplicates` | `backend-node/src/modules/crm/crm.routes.ts` |
| GET | `/leads` | `backend-node/src/modules/crm/crm.routes.ts` |
| GET | `/leads/:id` | `backend-node/src/modules/crm/crm.routes.ts` |
| POST | `/leads` | `backend-node/src/modules/crm/crm.routes.ts` |
| PATCH | `/leads/:id` | `backend-node/src/modules/crm/crm.routes.ts` |
| PATCH | `/leads/:id/stage` | `backend-node/src/modules/crm/crm.routes.ts` |
| POST | `/leads/:id/appointments` | `backend-node/src/modules/crm/crm.routes.ts` |
| GET | `/leads/:id/activities` | `backend-node/src/modules/crm/crm.routes.ts` |
| POST | `/activities` | `backend-node/src/modules/crm/crm.routes.ts` |

## customers (10)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/customers/duplicates` | `backend-node/src/modules/customers/customer.routes.ts` |
| GET | `/customers` | `backend-node/src/modules/customers/customer.routes.ts` |
| GET | `/customers/:id` | `backend-node/src/modules/customers/customer.routes.ts` |
| POST | `/customers` | `backend-node/src/modules/customers/customer.routes.ts` |
| PATCH | `/customers/:id` | `backend-node/src/modules/customers/customer.routes.ts` |
| GET | `/customers/:id/contacts` | `backend-node/src/modules/customers/customer.routes.ts` |
| POST | `/customers/:id/contacts` | `backend-node/src/modules/customers/customer.routes.ts` |
| PATCH | `/customers/:id/contacts/:contactId` | `backend-node/src/modules/customers/customer.routes.ts` |
| DELETE | `/customers/:id/contacts/:contactId` | `backend-node/src/modules/customers/customer.routes.ts` |
| GET | `/customers/:id/360` | `backend-node/src/modules/customers/customer.routes.ts` |

## dashboard (2)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/dashboard/overview` | `backend-node/src/modules/dashboard/dashboard.routes.ts` |
| GET | `/global-search` | `backend-node/src/modules/dashboard/dashboard.routes.ts` |

## deliveries (35)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/delivery-checklist-config` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| POST | `/delivery-checklist-config/categories` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| PATCH | `/delivery-checklist-config/categories/:id` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| PATCH | `/delivery-checklist-config/categories/:id/status` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| POST | `/delivery-checklist-config/categories/reorder` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| POST | `/delivery-checklist-config/categories/:categoryId/items` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| PATCH | `/delivery-checklist-config/items/:id` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| PATCH | `/delivery-checklist-config/items/:id/status` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| POST | `/delivery-checklist-config/categories/:categoryId/items/reorder` | `backend-node/src/modules/deliveries/delivery-checklist.routes.ts` |
| GET | `/delivery-services/catalog` | `backend-node/src/modules/deliveries/delivery-service.routes.ts` |
| POST | `/delivery-services/catalog` | `backend-node/src/modules/deliveries/delivery-service.routes.ts` |
| PATCH | `/delivery-services/catalog/:id` | `backend-node/src/modules/deliveries/delivery-service.routes.ts` |
| PATCH | `/delivery-services/catalog/:id/status` | `backend-node/src/modules/deliveries/delivery-service.routes.ts` |
| GET | `/deliveries/:id/services` | `backend-node/src/modules/deliveries/delivery-service.routes.ts` |
| POST | `/deliveries/:id/services` | `backend-node/src/modules/deliveries/delivery-service.routes.ts` |
| GET | `/deliveries` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/deliveries/stats` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/deliveries/candidates` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/deliveries/candidates/:saleId/specialists` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/delivery/financial-authorizations/:saleId` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| POST | `/delivery/financial-authorizations` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| POST | `/delivery/financial-authorizations/:authorizationId/revoke` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/deliveries/:id/checklist-applicable-categories` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/deliveries/:id` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| POST | `/deliveries` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| PATCH | `/deliveries/:id/status` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| PATCH | `/deliveries/:id/cancel` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| PATCH | `/deliveries/:id/reschedule` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| PATCH | `/deliveries/:id/checklist/:itemId` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| POST | `/deliveries/:id/documents` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| PATCH | `/deliveries/:id/documents/:documentId` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/deliveries/:id/documents/:documentId/download` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| POST | `/deliveries/:id/sign` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/deliveries/:id/pdf` | `backend-node/src/modules/deliveries/delivery.routes.ts` |
| GET | `/deliveries-planning/pdf` | `backend-node/src/modules/deliveries/delivery.routes.ts` |

## document-marks (22)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/document-marks/signature/me` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| POST | `/document-marks/signature/me` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| DELETE | `/document-marks/signature/me` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| GET | `/document-marks/signature/me/:id/image` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| GET | `/document-marks/stamps` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| POST | `/document-marks/stamps` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| POST | `/document-marks/stamps/:id/version` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| GET | `/document-marks/stamps/:id/versions` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| PATCH | `/document-marks/stamps/:id/status` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| GET | `/document-marks/stamps/:stampId/versions/:versionId/image` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| GET | `/document-marks/types` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| GET | `/document-marks/categories` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| POST | `/document-marks/categories` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| PATCH | `/document-marks/categories/:id` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| GET | `/document-marks/policies` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| PUT | `/document-marks/policies/:documentType` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| GET | `/roles/:roleId/stamps` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| PUT | `/roles/:roleId/stamps` | `backend-node/src/modules/document-marks/document-mark.routes.ts` |
| POST | `/document-marks/stamps/:id/version` | `backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts` |
| PATCH | `/document-marks/stamps/:id/status` | `backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts` |
| POST | `/document-marks/stamps/:id/revoke` | `backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts` |
| DELETE | `/document-marks/stamps/:id` | `backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts` |

## documents (11)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/documents/references` | `backend-node/src/modules/documents/document.routes.ts` |
| GET | `/documents/entities/search` | `backend-node/src/modules/documents/document.routes.ts` |
| GET | `/documents/entity/:entityType/:entityId` | `backend-node/src/modules/documents/document.routes.ts` |
| GET | `/documents` | `backend-node/src/modules/documents/document.routes.ts` |
| GET | `/documents/:id` | `backend-node/src/modules/documents/document.routes.ts` |
| POST | `/documents` | `backend-node/src/modules/documents/document.routes.ts` |
| GET | `/documents/:id/preview` | `backend-node/src/modules/documents/document.routes.ts` |
| GET | `/documents/:id/download` | `backend-node/src/modules/documents/document.routes.ts` |
| DELETE | `/documents/:id` | `backend-node/src/modules/documents/document.routes.ts` |
| POST | `/documents/:id/restore` | `backend-node/src/modules/documents/document.routes.ts` |
| POST | `/documents/:id/version` | `backend-node/src/modules/documents/document.routes.ts` |

## hr (98)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/hr/bonus-types` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| POST | `/hr/bonus-types` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| PATCH | `/hr/bonus-types/:id` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| GET | `/hr/employees/:employeeId/bonuses` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| GET | `/hr/bonuses/:id` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| GET | `/hr/bonuses` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| POST | `/hr/employees/:employeeId/bonuses` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| PATCH | `/hr/bonuses/:id` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| POST | `/hr/bonuses/:id/submit` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| POST | `/hr/bonuses/:id/approve` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| POST | `/hr/bonuses/:id/reject` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| POST | `/hr/bonuses/:id/cancel` | `backend-node/src/modules/hr/hr-bonus.routes.ts` |
| GET | `/hr/contract-types` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| POST | `/hr/contract-types` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| PATCH | `/hr/contract-types/:id` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| GET | `/hr/employees/:employeeId/contracts` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| GET | `/hr/contracts/:id` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| POST | `/hr/employees/:employeeId/contracts` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| PATCH | `/hr/contracts/:id` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| POST | `/hr/contracts/:id/activate` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| POST | `/hr/contracts/:id/end` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| POST | `/hr/contracts/:id/cancel` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| POST | `/hr/contracts/:id/renew` | `backend-node/src/modules/hr/hr-contract.routes.ts` |
| GET | `/hr/leave-types` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| POST | `/hr/leave-types` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| PATCH | `/hr/leave-types/:id` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| GET | `/hr/employees/:employeeId/leaves` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| GET | `/hr/leaves` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| POST | `/hr/employees/:employeeId/leaves` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| PATCH | `/hr/leaves/:id` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| POST | `/hr/leaves/:id/submit` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| POST | `/hr/leaves/:id/approve` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| POST | `/hr/leaves/:id/reject` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| POST | `/hr/leaves/:id/cancel` | `backend-node/src/modules/hr/hr-leave.routes.ts` |
| GET | `/hr/remunerations` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| GET | `/hr/remunerations/agencies/options` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| GET | `/hr/remunerations/:id/history` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| GET | `/hr/remunerations/:id/compatible-budgets` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| POST | `/hr/remunerations/prepare` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| PATCH | `/hr/remunerations/:id` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| POST | `/hr/remunerations/:id/submit` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| POST | `/hr/remunerations/:id/validate` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| POST | `/hr/remunerations/:id/reject` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| POST | `/hr/remunerations/:id/engage` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| POST | `/hr/remunerations/:id/payments` | `backend-node/src/modules/hr/hr-remuneration.routes.ts` |
| GET | `/hr/employees` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/employees` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/employees/eligible-users` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/employees/:id` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/employees/:id/pdf` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/employees/:id/link-user` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/employees/:id/unlink-user` | `backend-node/src/modules/hr/hr.routes.ts` |
| PATCH | `/hr/employees/:id` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/employees/:id/salaries` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/employees/:id/salaries` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/stock-agencies` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/stock-concessions` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/internal-stock-categories` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/internal-stock-categories` | `backend-node/src/modules/hr/hr.routes.ts` |
| PATCH | `/hr/internal-stock-categories/:id` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/internal-stock` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/internal-stock` | `backend-node/src/modules/hr/hr.routes.ts` |
| PATCH | `/hr/internal-stock/:id/minimum-threshold` | `backend-node/src/modules/hr/hr.routes.ts` |
| PATCH | `/hr/internal-stock/:id/status` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/internal-stock/:id/movements` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/internal-stock/:id/movements` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/budget-categories` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/budget-category-concessions` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budget-categories` | `backend-node/src/modules/hr/hr.routes.ts` |
| PATCH | `/hr/budget-categories/:id` | `backend-node/src/modules/hr/hr.routes.ts` |
| PATCH | `/hr/budget-categories/:id/status` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/budgets` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/budget-targets` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/concessions` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets/:id/submit` | `backend-node/src/modules/hr/hr.routes.ts` |
| PATCH | `/hr/budgets/:id` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets/:id/approve` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets/:id/reject` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets/:id/reopen` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets/:id/cancel` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets/:id/close` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/budgets/:id/approval-history` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/budgets/:id/funds` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets/:id/funds` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/budget-fund-requests` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budget-fund-requests/:id/approve` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budget-fund-requests/:id/reject` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/expenses` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/budgets/:id/expenses` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/budgets/:id/expenses` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/expenses/:id/submit` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/expenses/:id/approve` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/expenses/:id/reject` | `backend-node/src/modules/hr/hr.routes.ts` |
| POST | `/hr/expenses/:id/cancel` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/overview` | `backend-node/src/modules/hr/hr.routes.ts` |
| GET | `/hr/reporting` | `backend-node/src/modules/hr/hr.routes.ts` |
| PATCH | `/hr/expenses/:id` | `backend-node/src/modules/hr/hr.routes.ts` |

## notifications (6)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/notifications` | `backend-node/src/modules/notifications/notification.routes.ts` |
| GET | `/notifications/unread-count` | `backend-node/src/modules/notifications/notification.routes.ts` |
| PATCH | `/notifications/read-all` | `backend-node/src/modules/notifications/notification.routes.ts` |
| PATCH | `/notifications/:id/read` | `backend-node/src/modules/notifications/notification.routes.ts` |
| PATCH | `/notifications/:id/archive` | `backend-node/src/modules/notifications/notification.routes.ts` |
| DELETE | `/notifications/:id` | `backend-node/src/modules/notifications/notification.routes.ts` |

## parts (46)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/part-references` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/part-categories` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/part-categories` | `backend-node/src/modules/parts/part.routes.ts` |
| PATCH | `/part-categories/:id` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/part-locations/agencies` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/part-locations` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/part-locations` | `backend-node/src/modules/parts/part.routes.ts` |
| PATCH | `/part-locations/:id` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/suppliers` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/suppliers/:id` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/suppliers` | `backend-node/src/modules/parts/part.routes.ts` |
| PATCH | `/suppliers/:id` | `backend-node/src/modules/parts/part.routes.ts` |
| PATCH | `/suppliers/:id/status` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/parts` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/parts` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/parts/:id` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/parts/:id/movements` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/parts` | `backend-node/src/modules/parts/part.routes.ts` |
| PATCH | `/parts/:id` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/parts/:id/inventory-count` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/parts/:id/adjustments` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/parts/:id/returns` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/parts/:id/transfers` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/parts/:id/movements` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/purchase-orders` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/purchase-orders/:id` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/purchase-orders` | `backend-node/src/modules/parts/part.routes.ts` |
| PATCH | `/purchase-orders/:id` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/purchase-orders/:id/items` | `backend-node/src/modules/parts/part.routes.ts` |
| PATCH | `/purchase-orders/:id/items/:itemId` | `backend-node/src/modules/parts/part.routes.ts` |
| PATCH | `/purchase-orders/:id/status` | `backend-node/src/modules/parts/part.routes.ts` |
| POST | `/purchase-orders/:id/receipts` | `backend-node/src/modules/parts/part.routes.ts` |
| GET | `/supplier-invoices` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| GET | `/supplier-invoices/indicators` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| GET | `/supplier-invoices/options` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| POST | `/supplier-invoices` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| GET | `/supplier-invoices/:id` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| PATCH | `/supplier-invoices/:id` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| POST | `/supplier-invoices/:id/${path}` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| POST | `/supplier-invoices/:id/budget-link` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| POST | `/supplier-invoices/:id/payments` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| POST | `/supplier-invoices/:id/credits` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| POST | `/supplier-credits/:id/submit` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| POST | `/supplier-credits/:id/validate` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| POST | `/supplier-credits/:id/reject` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |
| GET | `/supplier-invoices/:id/history` | `backend-node/src/modules/parts/supplier-finance.routes.ts` |

## quotations (9)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/quotations/config` | `backend-node/src/modules/quotations/quotation.routes.ts` |
| GET | `/quotations` | `backend-node/src/modules/quotations/quotation.routes.ts` |
| GET | `/quotations/opportunity/:opportunityId` | `backend-node/src/modules/quotations/quotation.routes.ts` |
| GET | `/quotations/:id/pdf` | `backend-node/src/modules/quotations/quotation.routes.ts` |
| GET | `/quotations/:id` | `backend-node/src/modules/quotations/quotation.routes.ts` |
| POST | `/quotations` | `backend-node/src/modules/quotations/quotation.routes.ts` |
| PATCH | `/quotations/:id` | `backend-node/src/modules/quotations/quotation.routes.ts` |
| POST | `/quotations/:id/validate` | `backend-node/src/modules/quotations/quotation.routes.ts` |
| POST | `/quotations/:id/cancel` | `backend-node/src/modules/quotations/quotation.routes.ts` |

## reports (20)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/reports/consolidated/commercial` | `backend-node/src/modules/reports/extended-report.routes.ts` |
| GET | `/reports/consolidated/treasury` | `backend-node/src/modules/reports/extended-report.routes.ts` |
| GET | `/reports/consolidated/budgets` | `backend-node/src/modules/reports/extended-report.routes.ts` |
| GET | `/reports/consolidated/hr` | `backend-node/src/modules/reports/extended-report.routes.ts` |
| GET | `/reports/consolidated/activity` | `backend-node/src/modules/reports/extended-report.routes.ts` |
| GET | `/reports/consolidated/returns` | `backend-node/src/modules/reports/extended-report.routes.ts` |
| GET | `/reports/financial/:section` | `backend-node/src/modules/reports/financial-report.routes.ts` |
| GET | `/reports/financial-export/:section` | `backend-node/src/modules/reports/financial-report.routes.ts` |
| GET | `/reports/margin-provenance` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/overview` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/revenue` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/sales` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/salespeople` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/vehicles` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/workshop` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/warranties` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/parts` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/finance` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/agencies` | `backend-node/src/modules/reports/report.routes.ts` |
| GET | `/reports/export` | `backend-node/src/modules/reports/report.routes.ts` |

## sales (9)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/sales` | `backend-node/src/modules/sales/sale.routes.ts` |
| GET | `/sales/config/direct-tax` | `backend-node/src/modules/sales/sale.routes.ts` |
| GET | `/sales/:id` | `backend-node/src/modules/sales/sale.routes.ts` |
| GET | `/vehicles/:id/warranty-proposal` | `backend-node/src/modules/sales/sale.routes.ts` |
| GET | `/sales/vehicles/:id/pricing-guard` | `backend-node/src/modules/sales/sale.routes.ts` |
| POST | `/sales` | `backend-node/src/modules/sales/sale.routes.ts` |
| PATCH | `/sales/:id` | `backend-node/src/modules/sales/sale.routes.ts` |
| PATCH | `/sales/:id/warranty` | `backend-node/src/modules/sales/sale.routes.ts` |
| PATCH | `/sales/:id/status` | `backend-node/src/modules/sales/sale.routes.ts` |

## settings (24)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/settings` | `backend-node/src/modules/settings/setting.routes.ts` |
| PUT | `/settings` | `backend-node/src/modules/settings/setting.routes.ts` |
| GET | `/concessions/current` | `backend-node/src/modules/settings/setting.routes.ts` |
| PATCH | `/concessions/current` | `backend-node/src/modules/settings/setting.routes.ts` |
| PUT | `/concessions/current/document-logo` | `backend-node/src/modules/settings/setting.routes.ts` |
| DELETE | `/concessions/current/document-logo` | `backend-node/src/modules/settings/setting.routes.ts` |
| GET | `/agencies` | `backend-node/src/modules/settings/setting.routes.ts` |
| POST | `/agencies` | `backend-node/src/modules/settings/setting.routes.ts` |
| PATCH | `/agencies/:id` | `backend-node/src/modules/settings/setting.routes.ts` |
| PATCH | `/agencies/:id/status` | `backend-node/src/modules/settings/setting.routes.ts` |
| GET | `/workshop-labor-rates` | `backend-node/src/modules/settings/setting.routes.ts` |
| POST | `/workshop-labor-rates` | `backend-node/src/modules/settings/setting.routes.ts` |
| PATCH | `/workshop-labor-rates/:id` | `backend-node/src/modules/settings/setting.routes.ts` |
| PUT | `/workshop-labor-rates/:id/agency-override` | `backend-node/src/modules/settings/setting.routes.ts` |
| DELETE | `/workshop-labor-rates/:id/agency-override` | `backend-node/src/modules/settings/setting.routes.ts` |
| GET | `/settings/manufacturers` | `backend-node/src/modules/settings/setting.routes.ts` |
| POST | `/settings/manufacturers` | `backend-node/src/modules/settings/setting.routes.ts` |
| PATCH | `/settings/manufacturers/:id` | `backend-node/src/modules/settings/setting.routes.ts` |
| PATCH | `/settings/manufacturers/:id/status` | `backend-node/src/modules/settings/setting.routes.ts` |
| GET | `/settings/document-references` | `backend-node/src/modules/settings/setting.routes.ts` |
| POST | `/settings/document-categories` | `backend-node/src/modules/settings/setting.routes.ts` |
| PATCH | `/settings/document-categories/:id` | `backend-node/src/modules/settings/setting.routes.ts` |
| POST | `/settings/document-types` | `backend-node/src/modules/settings/setting.routes.ts` |
| PATCH | `/settings/document-types/:id` | `backend-node/src/modules/settings/setting.routes.ts` |

## showroom (18)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| PATCH | `/showroom/test-drives/:id/schedule` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| PATCH | `/showroom/test-drives/:id/start` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| PATCH | `/showroom/test-drives/:id/cancel` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| GET | `/showroom/agencies/visitor-create` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| GET | `/showroom/agencies/:agencyId/sales-candidates` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| GET | `/showroom/detect` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| GET | `/showroom` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| GET | `/showroom/test-drive-config` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| GET | `/showroom/:id` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| POST | `/showroom/crm/leads/:leadId/test-drives` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| POST | `/showroom` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| PATCH | `/showroom/:id/assign` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| PATCH | `/showroom/:id/take-over` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| PATCH | `/showroom/:id/complete` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| PATCH | `/showroom/:id/cancel` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| POST | `/showroom/:id/test-drives` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| PATCH | `/showroom/test-drives/:id/complete` | `backend-node/src/modules/showroom/showroom.routes.ts` |
| POST | `/showroom/:id/convert-to-lead` | `backend-node/src/modules/showroom/showroom.routes.ts` |

## treasury (52)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/treasury/bank-statements` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| POST | `/treasury/bank-statements/preview` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| GET | `/treasury/bank-statements/:id` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| POST | `/treasury/bank-statements/:id/validate` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| POST | `/treasury/bank-statements/:id/reject` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| POST | `/treasury/bank-statements/:id/cancel` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| GET | `/treasury/bank-statements/:id/history` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| GET | `/treasury/bank-statement-lines/:id/proposals` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| POST | `/treasury/bank-reconciliations` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| POST | `/treasury/bank-reconciliations/:id/cancel` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| GET | `/treasury/bank-unmatched` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| GET | `/treasury/bank-statements/:id/export` | `backend-node/src/modules/treasury/bank-reconciliation.routes.ts` |
| GET | `/treasury/accounts` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/account-territories` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/accounts/:id` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/accounts` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PATCH | `/treasury/accounts/:id` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PATCH | `/treasury/accounts/:id/status` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/categories` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/categories` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PATCH | `/treasury/categories/:id` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PATCH | `/treasury/categories/:id/status` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/journal` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/journal/export` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/journal/:id` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/summary` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/coverage` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/budget-indicators` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/reservations` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/reservation-expenses` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/reservations` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/reservations/:id/submit` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/reservations/:id/approve` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/reservations/:id/reject` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/reservations/:id/cancel` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/reservations/:id/expire` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PATCH | `/treasury/reservations/:id` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/reservations/:id/release` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/reservations/:id/history` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/manual-options` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/transfers` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/manual-receipts` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/manual-disbursements` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/hr/budget-expenses/:id/disbursements` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/hr/budget-expenses/:id/disbursements` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| POST | `/treasury/movements/:id/reversal` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| GET | `/treasury/flow-configuration` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PUT | `/treasury/flow-mappings` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PATCH | `/treasury/flow-mappings/:id` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PATCH | `/treasury/flow-mappings/:id/status` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| DELETE | `/treasury/flow-mappings/:id` | `backend-node/src/modules/treasury/treasury.routes.ts` |
| PATCH | `/treasury/flow-readiness` | `backend-node/src/modules/treasury/treasury.routes.ts` |

## users (21)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/users/directory` | `backend-node/src/modules/users/user.routes.ts` |
| GET | `/users/me` | `backend-node/src/modules/users/user.routes.ts` |
| PATCH | `/users/me` | `backend-node/src/modules/users/user.routes.ts` |
| PATCH | `/users/me/password` | `backend-node/src/modules/users/user.routes.ts` |
| POST | `/users/me/avatar` | `backend-node/src/modules/users/user.routes.ts` |
| DELETE | `/users/me/avatar` | `backend-node/src/modules/users/user.routes.ts` |
| GET | `/users` | `backend-node/src/modules/users/user.routes.ts` |
| GET | `/users/:id` | `backend-node/src/modules/users/user.routes.ts` |
| POST | `/users` | `backend-node/src/modules/users/user.routes.ts` |
| PATCH | `/users/:id` | `backend-node/src/modules/users/user.routes.ts` |
| PATCH | `/users/:id/status` | `backend-node/src/modules/users/user.routes.ts` |
| PATCH | `/users/:id/password` | `backend-node/src/modules/users/user.routes.ts` |
| POST | `/users/:id/avatar` | `backend-node/src/modules/users/user.routes.ts` |
| DELETE | `/users/:id/avatar` | `backend-node/src/modules/users/user.routes.ts` |
| GET | `/permissions` | `backend-node/src/modules/users/user.routes.ts` |
| GET | `/roles` | `backend-node/src/modules/users/user.routes.ts` |
| GET | `/roles/:id/permissions` | `backend-node/src/modules/users/user.routes.ts` |
| POST | `/roles` | `backend-node/src/modules/users/user.routes.ts` |
| PATCH | `/roles/:id` | `backend-node/src/modules/users/user.routes.ts` |
| PATCH | `/roles/:id/status` | `backend-node/src/modules/users/user.routes.ts` |
| DELETE | `/roles/:id` | `backend-node/src/modules/users/user.routes.ts` |

## vehicle-returns (14)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/vehicle-returns` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| GET | `/vehicle-returns/:id` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| GET | `/vehicle-returns/:id/options` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns/:id/inspection` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns/:id/approve` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns/:id/reject` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns/:id/deductions` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| DELETE | `/vehicle-returns/:id/deductions/:deductionId` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns/:id/financial-resolution` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns/:id/receive` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns/:id/stock-decision` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| POST | `/vehicle-returns/:id/close` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |
| GET | `/vehicle-returns/:id/pdf` | `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts` |

## vehicles (21)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/vehicle-locations` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| POST | `/vehicle-locations` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| PATCH | `/vehicle-locations/:id` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicle-transfer-agencies` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicle-transfer-locations` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicles/stats` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicles/location-counts` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicles/agencies/create` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/documents/business/vehicle/:id/pdf` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicle-references` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicles/filter-options` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicles` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicles/:id` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| GET | `/vehicles/:id/360` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| POST | `/vehicles` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| PATCH | `/vehicles/:id` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| PATCH | `/vehicles/:id/status` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| POST | `/vehicles/:id/transfer` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| POST | `/vehicles/:id/images` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| PATCH | `/vehicles/:id/images/:imageId/primary` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |
| DELETE | `/vehicles/:id/images/:imageId` | `backend-node/src/modules/vehicles/vehicle.routes.ts` |

## workshop (76)

| Méthode | Chemin déclaré | Fichier |
|---|---|---|
| GET | `/warranty-providers` | `backend-node/src/modules/workshop/warranty.routes.ts` |
| GET | `/repair-orders/:id/warranty` | `backend-node/src/modules/workshop/warranty.routes.ts` |
| PUT | `/repair-orders/:id/warranty` | `backend-node/src/modules/workshop/warranty.routes.ts` |
| POST | `/repair-orders/:id/warranty/decision` | `backend-node/src/modules/workshop/warranty.routes.ts` |
| PUT | `/repair-orders/:id/warranty/allocations` | `backend-node/src/modules/workshop/warranty.routes.ts` |
| POST | `/repair-orders/:id/warranty/confirm` | `backend-node/src/modules/workshop/warranty.routes.ts` |
| POST | `/warranty-claims/:id/payments` | `backend-node/src/modules/workshop/warranty.routes.ts` |
| GET | `/workshop/vehicles/search` | `backend-node/src/modules/workshop/workshop-vehicle.routes.ts` |
| POST | `/workshop/external-vehicles` | `backend-node/src/modules/workshop/workshop-vehicle.routes.ts` |
| POST | `/workshop/vehicle-associations` | `backend-node/src/modules/workshop/workshop-vehicle.routes.ts` |
| GET | `/workshop/customers/:customerId/vehicle-associations` | `backend-node/src/modules/workshop/workshop-vehicle.routes.ts` |
| PATCH | `/workshop/vehicle-associations/:id/close` | `backend-node/src/modules/workshop/workshop-vehicle.routes.ts` |
| GET | `/workshop/config` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/:id/technician-candidates` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/:id/labor-rates` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/:id/available-parts` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/:id/available-parts/:partId/stocks` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/parts-work-queue` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/parts-work-queue/:id` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/workshop/external-customers` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/workshop/external-customers/:customerId` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/advisor-candidates` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/customer-candidates` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/customer-vehicles` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/stats` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/:id` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/vehicles/:vehicleId/warranty-eligibility` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/:id/abandonment-impact` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/abandonment` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/abandonment/finalize` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/abandonment/handover` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/repair-orders/:id/status` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/inspection` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/diagnostics` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/estimate-items` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| DELETE | `/repair-orders/:id/estimate-items/:itemId` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/approval` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/service-appointments` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/service-appointments` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/service-appointments/:id/status` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/items` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/repair-orders/:id/items/:itemId` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| DELETE | `/repair-orders/:id/items/:itemId` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/estimate-items/:estimateItemId/intervention` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/interventions` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/repair-orders/:id/interventions/:interventionId/status` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/estimate-items/:estimateItemId/reserve` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/parts/reserve` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/repair-orders/:id/parts/reservations/:reservationId` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/invoice` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/quality-control` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/handover` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/repair-orders/:id/advisor` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/assign` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/workshop/technicians` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/workshop/bays` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/workshop/bays` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/workshop/bays/:id` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/workshop/technicians` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/workshop/technicians/:id` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/workshop/technicians/:id/unavailability` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/workshop/unavailabilities` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| DELETE | `/workshop/unavailabilities/:id` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/workshop/planning` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/workshop/interventions/history` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/workshop/stats` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/workshop/schedules/:id` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| DELETE | `/workshop/schedules/:id` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| POST | `/repair-orders/:id/sessions/start` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/repair-orders/:id/sessions/:sessionId/pause` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/repair-orders/:id/sessions/:sessionId/resume` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/repair-orders/:id/sessions/:sessionId/stop` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| PATCH | `/workshop/time-entries/:id` | `backend-node/src/modules/workshop/workshop.routes.ts` |
| GET | `/repair-orders/:id/pdf` | `backend-node/src/modules/workshop/workshop.routes.ts` |



