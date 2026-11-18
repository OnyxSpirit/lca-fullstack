# Inventaire exhaustif des tableaux et listes

## Méthode et périmètre

Audit statique exhaustif du frontend au 18 novembre 2026. Ont été recherchés : balises `<table>`, rendus `.map()`, listes en cartes, historiques, journaux, onglets, modales et composants partagés. Le corpus comprend 211 fichiers frontend, 45 fichiers contenant au moins une table HTML, 62 tables HTML et 141 surfaces de collection après ajout des listes non tabulaires.

La [matrice détaillée](./07-matrice-couverture.md) constitue l'inventaire autoritatif : chaque surface possède un identifiant `PAG-nnn`, un module, un sous-module, son mode de pagination, son contrat API, sa priorité et sa recommandation. Les collections différentes d'une même page ont des lignes distinctes.

## Routes et fichiers principaux

| Navigation | Route | Fichiers principaux | Collections inventoriées |
|---|---|---|---|
| Tableau de bord | `/dashboard` | `frontend/src/modules/dashboard/DashboardPage.tsx` | PAG-037–038 |
| CRM | `/crm` | `frontend/src/modules/crm/CrmPage.tsx` | PAG-015–026 |
| Clients | `/customers`, `/customers/:id` | `CustomersListPage.tsx`, `CustomerDetailPage.tsx` | PAG-027–036 |
| Showroom | `/showroom` | `frontend/src/modules/showroom/ShowroomPage.tsx` | PAG-106–108 |
| Véhicules | `/vehicles`, `/vehicles/:id` | `VehiclesListPage.tsx`, `VehicleDetailPage.tsx` | PAG-109–114 |
| Ventes/Devis/Proformas | `/sales`, `/sales/quotations`, `/proformas` | `SalesListPage.tsx`, `QuotationsSection.tsx`, `ProformasPage.tsx` | PAG-084, PAG-091–093 |
| Livraisons | `/deliveries`, `/deliveries/:id` | `DeliveriesPage.tsx`, `DeliveryDetailPage.tsx` | PAG-039–044 |
| Facturation | `/billing`, `/billing/:id` | `BillingPage.tsx`, `InvoiceDetailPage.tsx` | PAG-007–014 |
| SAV/Atelier | `/service`, `/service/repair-orders/:id` | `ServiceDashboardPage.tsx`, `RepairOrderDetailPage.tsx`, `WorkshopPlanningPage.tsx` | PAG-094–105 |
| Pièces | `/parts`, `/parts/:id`, `/parts/repair-orders` | `SparePartsPage.tsx`, `SparePartDetailPage.tsx`, `PartsWorkQueuePage.tsx` | PAG-072–083 |
| Trésorerie/Comptabilité | `/treasury/*` | `TreasuryPage.tsx`, `AccountingPage.tsx`, panneaux spécialisés | PAG-115–131 |
| RH | `/hr` | `HrAdministrationPage.tsx` et panneaux RH | PAG-049–071 |
| GED | `/documents` | `DocumentsGedPage.tsx` | PAG-045–047 |
| Notifications | `/notifications` | `NotificationsPage.tsx` | PAG-048 |
| Activité | `/activity` | `ActivityPage.tsx` | PAG-001–002 |
| Reporting | `/reports` | `ReportsPage.tsx`, `FinancialReportPanel.tsx` | PAG-085–090 |
| Utilisateurs/2FA | `/users`, `/security/2fa` | `UsersManagementPage.tsx`, panneaux Auth | PAG-003–006, PAG-132–135 |
| Paramètres | `/settings` | `SettingsPage.tsx` et panneaux | PAG-136–141 |

## Propriétés vérifiées

- **Recherche/filtres/tri** : présents et transmis au serveur sur Clients, CRM Liste, Véhicules, Ventes, Devis, Livraisons, Factures, SAV, GED, Notifications, Activité et plusieurs écrans financiers. Les listes legacy chargées en entier filtrent souvent localement ou n'offrent pas de recherche.
- **Compteurs** : cohérents avec les métadonnées sur les contrats `PagedResult`. Les listes fixes `pageSize=50/100` sans navigation exposent un risque de compteur supérieur aux éléments consultables.
- **Changement de page** : les écrans principaux mettent `page` dans la clé React Query. Les filtres réinitialisent généralement à 1. Les composants `ClientPagination` recalculent une page valide quand les données diminuent.
- **Actualisation** : l'état de page est local, donc une actualisation revient généralement à la page 1 ; aucun contrat global ne conserve les paramètres dans l'URL.
- **Agence active/RBAC** : les hooks incluent le contexte utilisateur/agence dans les clés sensibles ou s'appuient sur le JWT et les guards. Aucun contournement observé par la pagination ; les totaux des endpoints paginés sont calculés dans le périmètre serveur.

## Volumes initiaux constatés

- Clients 15 ; véhicules 20 ; CRM liste 7 ; Showroom 6 ; devis, ventes, livraisons, commandes et historique Atelier 7 ; GED et notifications 10 par défaut ; activité selon sélection ; appareils/2FA 10 ; activités financières 20.
- Comptabilité : écritures 50 fixes et journaux 100 fixes sans navigation complète, classés partiels.
- `ClientPagination` : tailles 10/25/50, ou taille fixe fournie par le panneau.

Les chemins complets et endpoints de chaque anomalie sont repris dans les rapports 02 et 04.

## Index de traçabilité par identifiant

Cet index complète chaque ligne de la matrice avec son composant source. Un intervalle signifie que les surfaces restent des entrées distinctes dans la matrice, mais sont rendues par le même composant.

| IDs | Fichier/composant source |
|---|---|
| PAG-001–002 | `frontend/src/modules/activity/ActivityPage.tsx` |
| PAG-003–004 | `frontend/src/modules/auth/TrustedDevicesPanel.tsx` |
| PAG-005 | `frontend/src/modules/auth/TwoFactorUsersPanel.tsx` |
| PAG-006 | `frontend/src/modules/auth/TwoFactorAdministration.tsx` |
| PAG-007 | `frontend/src/modules/billing/BillingPage.tsx` |
| PAG-008–011 | `frontend/src/modules/billing/InvoiceDetailPage.tsx` |
| PAG-012 | `frontend/src/modules/billing/InvoicePaymentComponents.tsx` |
| PAG-013–014 | `frontend/src/modules/billing/NewInvoiceModal.tsx` |
| PAG-015–025 | `frontend/src/modules/crm/CrmPage.tsx` |
| PAG-026 | `frontend/src/modules/crm/NewLeadModal.tsx` |
| PAG-027 | `frontend/src/modules/customers/CustomersListPage.tsx` |
| PAG-028–036 | `frontend/src/modules/customers/CustomerDetailPage.tsx` |
| PAG-037–038 | `frontend/src/modules/dashboard/DashboardPage.tsx` |
| PAG-039 | `frontend/src/modules/deliveries/DeliveriesPage.tsx` |
| PAG-040 | `frontend/src/modules/deliveries/NewDeliveryModal.tsx` |
| PAG-041–043 | `frontend/src/modules/deliveries/DeliveryDetailPage.tsx` et panneaux checklist/services |
| PAG-044 | `frontend/src/modules/deliveries/DeliveryFinancialAuthorizationPanel.tsx` |
| PAG-045–046 | `frontend/src/modules/documents/DocumentsGedPage.tsx` |
| PAG-047 | `frontend/src/api/documentHooks.ts`, consommateurs de `useEntityDocuments` |
| PAG-048 | `frontend/src/modules/notifications/NotificationsPage.tsx` |
| PAG-049 | `frontend/src/modules/hr/UnifiedPersonnelTable.tsx` |
| PAG-050, 059–064 | `frontend/src/modules/hr/HrAdministrationPage.tsx` |
| PAG-051 | `frontend/src/modules/hr/EmployeeContractsSection.tsx` |
| PAG-052 | `frontend/src/modules/hr/EmployeeLeavesSection.tsx` |
| PAG-053 | `frontend/src/modules/hr/EmployeeBonusesSection.tsx` |
| PAG-054 | `frontend/src/modules/hr/EmployeeRecordModal.tsx` |
| PAG-055 | `frontend/src/modules/hr/LeavesAdministration.tsx` |
| PAG-056 | `frontend/src/modules/hr/BonusesAdministration.tsx` |
| PAG-057–058 | `frontend/src/modules/hr/RemunerationsAdministration.tsx` |
| PAG-065 | `frontend/src/modules/hr/UnifiedPersonnelTable.tsx` |
| PAG-066–067 | `frontend/src/modules/hr/ProviderContractsSection.tsx` |
| PAG-068 | `frontend/src/modules/hr/ProviderRemunerationsAdministration.tsx` |
| PAG-069 | `frontend/src/modules/hr/ProviderFinanceAdministration.tsx` |
| PAG-070 | managers de référentiels dans `frontend/src/modules/hr/` |
| PAG-071 | `frontend/src/modules/hr/FiscalAdministration.tsx` |
| PAG-072–074 | `frontend/src/modules/parts/SparePartsPage.tsx` |
| PAG-075 | `frontend/src/modules/parts/DirectPurchasesPanel.tsx` |
| PAG-076 | `frontend/src/modules/parts/PartLocationsPanel.tsx` |
| PAG-077–078 | `frontend/src/modules/parts/PartSalesPanel.tsx` |
| PAG-079 | `frontend/src/modules/parts/PartsWorkQueuePage.tsx` |
| PAG-080–081 | `frontend/src/modules/parts/SparePartDetailPage.tsx` |
| PAG-082–083 | `frontend/src/modules/parts/SupplierInvoicesPanel.tsx` |
| PAG-084 | `frontend/src/modules/proformas/ProformasPage.tsx` |
| PAG-085, 088–090 | `frontend/src/modules/reports/ReportsPage.tsx` |
| PAG-086 | `frontend/src/modules/reports/FinancialReportPanel.tsx` |
| PAG-087 | `frontend/src/modules/reports/ConsolidatedReportSections.tsx` |
| PAG-091 | `frontend/src/modules/sales/SalesListPage.tsx` |
| PAG-092 | `frontend/src/modules/sales/QuotationsSection.tsx` |
| PAG-093 | `frontend/src/modules/sales/SaleDetailPage.tsx` |
| PAG-094 | `frontend/src/modules/service/ServiceDashboardPage.tsx` |
| PAG-095–097 | `frontend/src/modules/service/ExternalCustomersPanel.tsx` |
| PAG-098–100 | `frontend/src/modules/service/RepairOrderDetailPage.tsx` |
| PAG-101–102 | `frontend/src/modules/service/SavBusinessSections.tsx` |
| PAG-103–105 | `frontend/src/modules/workshop/WorkshopPlanningPage.tsx` |
| PAG-106–108 | `frontend/src/modules/showroom/ShowroomPage.tsx` |
| PAG-109 | `frontend/src/modules/vehicles/VehiclesListPage.tsx` |
| PAG-110–112 | `frontend/src/modules/vehicles/VehicleDetailPage.tsx` |
| PAG-113 | `frontend/src/modules/vehicles/CommercialCatalogPage.tsx` |
| PAG-114 | `frontend/src/modules/vehicles/VehicleTransfersPanel.tsx` et `VehicleTransferModal.tsx` |
| PAG-115 | `frontend/src/modules/treasury/AccountingEntriesPanel.tsx` |
| PAG-116–119 | `frontend/src/modules/treasury/AccountingReferenceManagement.tsx` et `AccountingPage.tsx` |
| PAG-120 | `frontend/src/modules/treasury/AccountingAutomationPanels.tsx` |
| PAG-121–122 | `frontend/src/modules/treasury/AccountingAdvancedPanels.tsx` |
| PAG-123–126 | `frontend/src/modules/treasury/TreasuryPage.tsx`, `BudgetTreasuryPanel.tsx` |
| PAG-127–129 | `frontend/src/modules/treasury/BankReconciliationPanel.tsx`, `BankReconciliationGroupsPanel.tsx` |
| PAG-130 | `frontend/src/modules/treasury/FinancialDashboardPage.tsx` |
| PAG-131 | `frontend/src/modules/treasury/TreasuryFlowMappingsTable.tsx` |
| PAG-132 | `frontend/src/modules/users/UsersManagementPage.tsx` |
| PAG-133–134 | `frontend/src/modules/users/RoleManagementPanel.tsx` |
| PAG-135 | `frontend/src/modules/users/UserAgencyAssignments.tsx` |
| PAG-136 | `frontend/src/modules/settings/SettingsPage.tsx` |
| PAG-137 | `frontend/src/modules/settings/ManufacturersSettings.tsx` |
| PAG-138 | `frontend/src/modules/settings/OperationalResourcesSettings.tsx` |
| PAG-139 | composants `Document*Settings.tsx` et `DocumentMarksSettings.tsx` |
| PAG-140 | `frontend/src/modules/settings/WorkshopLaborRatesSettings.tsx` |
| PAG-141 | `frontend/src/modules/settings/VehicleLocationsSettings.tsx` |
