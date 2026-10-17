# Annexe — Inventaire global par module

Généré par analyse statique du code source le 17 octobre 2026. Les nombres ne valent pas validation fonctionnelle.

- Domaines frontend : 23
- Domaines backend : 24
- Déclarations de routes HTTP détectées : 555
- Migrations SQL : 57

| Module | Frontend | Backend | Fichiers UI/TS | Routes API | Pages/composants principaux |
|---|---:|---:|---:|---:|---|
| activity | oui | oui | 2 | 5 | ActivityPage |
| auth | oui | oui | 8 | 28 | LoginPage, StrongAuthenticationModal, TrustedDevicesPage, TrustedDevicesPanel, TwoFactorSecurityCenterPage, TwoFactorSecuritySettingsPage, TwoFactorSettings, TwoFactorUsersPanel |
| billing | oui | oui | 6 | 17 | BillingPage, InvoiceDetailPage, InvoicePaymentComponents, NewInvoiceModal |
| core | non | oui | 0 | 1 | — |
| crm | oui | oui | 5 | 10 | CrmPage, CrmTestDriveModal, NewLeadModal, QuotationModal |
| customers | oui | oui | 2 | 10 | CustomerDetailPage, CustomersListPage |
| dashboard | oui | oui | 1 | 2 | DashboardPage |
| deliveries | oui | oui | 6 | 35 | DeliveriesPage, DeliveryChecklistTemplates, DeliveryDetailPage, DeliveryFinancialAuthorizationPanel, DeliveryServicesPanel, NewDeliveryModal |
| document-marks | non | oui | 0 | 22 | — |
| documents | oui | oui | 4 | 11 | DocumentFileDropField, DocumentPreview, DocumentsGedPage |
| errors | oui | non | 2 | 0 | AccessDeniedPage, NotFoundPage |
| hr | oui | oui | 15 | 98 | BonusTypesManager, BonusesAdministration, BudgetExpenseDisbursement, ContractTypesManager, EmployeeBonusesSection, EmployeeContractsSection, EmployeeLeavesSection, EmployeeRecordModal, HrAdministrationPage, HrAnalytics, LeaveTypesManager, LeavesAdministration… |
| modules-portal | oui | non | 1 | 0 | ModulesPortalPage |
| notifications | oui | oui | 2 | 6 | NotificationsPage |
| parts | oui | oui | 5 | 46 | PartLocationsPanel, PartsWorkQueuePage, SparePartDetailPage, SparePartsPage, SupplierInvoicesPanel |
| quotations | non | oui | 0 | 9 | — |
| rbac | non | oui | 0 | 0 | — |
| reports | oui | oui | 3 | 20 | ConsolidatedReportSections, FinancialReportPanel, ReportsPage |
| sales | oui | oui | 4 | 9 | SaleDetailPage, SaleWizardModal, SalesListPage |
| service | oui | non | 10 | 0 | ExternalCustomersPanel, NewRepairOrderModal, RepairOrderDetailPage, ServiceDashboardPage, VehicleWarrantyContractCard, WarrantyCard |
| settings | oui | oui | 10 | 24 | DeliveryServicesSettings, DocumentMarksSettings, DocumentReferencesSettings, ManufacturersSettings, OperationalResourcesSettings, SettingsPage, SignaturePad, VehicleLocationsSettings, WorkshopLaborRatesSettings |
| showroom | oui | oui | 2 | 18 | ShowroomPage |
| treasury | oui | oui | 5 | 52 | BankReconciliationPanel, BudgetTreasuryPanel, TreasuryFlowMappingsTable, TreasuryManualDocuments, TreasuryPage |
| users | oui | oui | 4 | 21 | RoleManagementPanel, TwoFactorAdministration, UsersManagementPage |
| vehicle-returns | oui | oui | 1 | 14 | VehicleReturnPage |
| vehicles | oui | oui | 7 | 21 | EditVehicleModal, NewVehicleModal, VehicleDetailPage, VehicleTransferModal, VehiclesListPage |
| workshop | oui | oui | 1 | 76 | WorkshopPlanningPage |

## Routes frontend déclarées

```text
const lazyPage=(element:React.ReactNode)=><Suspense fallback={<RouteLoadingFallback/>}>{element}</Suspense>;
<RouteErrorBoundary>
<Routes>
<Route path={ROUTES.login} element={lazyPage(<LoginPage />)} />
<Route path="/" element={<ProtectedLayout />}>
<Route index element={<Navigate to={ROUTES.dashboard} replace />} />
<Route path="dashboard" element={lazyPage(<DashboardPage />)} />
<Route path="modules" element={lazyPage(<ModulesPortalPage />)} />
<Route path="crm" element={<ModuleGuard module="crm">{lazyPage(<CrmPage />)}</ModuleGuard>} />
<Route path="showroom" element={<ModuleGuard module="showroom">{lazyPage(<ShowroomPage />)}</ModuleGuard>} />
<Route path="vehicles" element={<ModuleGuard module="vehicles">{lazyPage(<VehiclesListPage />)}</ModuleGuard>} />
<Route path="vehicles/:id" element={<ModuleGuard module="vehicles">{lazyPage(<VehicleDetailPage />)}</ModuleGuard>} />
<Route path="sales" element={<ModuleGuard module="sales">{lazyPage(<SalesListPage />)}</ModuleGuard>} />
<Route path="sales/:id" element={<ModuleGuard module="sales">{lazyPage(<SaleDetailPage />)}</ModuleGuard>} />
<Route path="deliveries" element={<ModuleGuard module="deliveries">{lazyPage(<DeliveriesPage />)}</ModuleGuard>} />
<Route path="deliveries/:id" element={<ModuleGuard module="deliveries">{lazyPage(<DeliveryDetailPage />)}</ModuleGuard>} />
<Route path="vehicle-returns/:id" element={<ModuleGuard module="deliveries">{lazyPage(<VehicleReturnPage />)}</ModuleGuard>} />
<Route path="customers" element={<ModuleGuard module="customers">{lazyPage(<CustomersListPage />)}</ModuleGuard>} />
<Route path="customers/:id" element={<ModuleGuard module="customers">{lazyPage(<CustomerDetailPage />)}</ModuleGuard>} />
<Route path="service" element={<ModuleGuard module="service">{lazyPage(<ServiceDashboardPage />)}</ModuleGuard>} />
<Route path="service/repair-orders/:id" element={<ModuleGuard module="service">{lazyPage(<RepairOrderDetailPage />)}</ModuleGuard>} />
<Route path="workshop" element={<ModuleGuard module="workshop">{lazyPage(<WorkshopPlanningPage />)}</ModuleGuard>} />
<Route path="parts" element={<ModuleGuard module="parts">{lazyPage(<SparePartsPage />)}</ModuleGuard>} />
<Route path="parts/repair-orders" element={<ModuleGuard module="parts">{lazyPage(<PartsWorkQueuePage />)}</ModuleGuard>} />
<Route path="parts/repair-orders/:id" element={<ModuleGuard module="parts">{lazyPage(<PartsWorkQueuePage />)}</ModuleGuard>} />
<Route path="parts/:id" element={<ModuleGuard module="parts">{lazyPage(<SparePartDetailPage />)}</ModuleGuard>} />
<Route path="notifications" element={<ModuleGuard module="notifications">{lazyPage(<NotificationsPage />)}</ModuleGuard>} />
<Route path="billing" element={<ModuleGuard module="billing">{lazyPage(<BillingPage />)}</ModuleGuard>} />
<Route path="billing/:id" element={<ModuleGuard module="billing">{lazyPage(<InvoiceDetailPage />)}</ModuleGuard>} />
<Route path="treasury" element={<ModuleGuard module="treasury">{lazyPage(<TreasuryPage />)}</ModuleGuard>} />
<Route path="reports" element={<ModuleGuard module="reports">{lazyPage(<ReportsPage />)}</ModuleGuard>} />
<Route path="documents" element={<ModuleGuard module="documents">{lazyPage(<DocumentsGedPage />)}</ModuleGuard>} />
<Route path="hr" element={<ModuleGuard module="hr">{lazyPage(<HrAdministrationPage />)}</ModuleGuard>} />
<Route path="users" element={<UsersRbacGuard>{lazyPage(<UsersManagementPage />)}</UsersRbacGuard>} />
<Route path="settings" element={<ModuleGuard module="settings">{lazyPage(<SettingsPage />)}</ModuleGuard>} />
<Route path="activity" element={<ModuleGuard module="activity">{lazyPage(<ActivityPage />)}</ModuleGuard>} />
<Route path="security/2fa" element={<SecurityCenterGuard>{lazyPage(<UsersManagementPage />)}</SecurityCenterGuard>} />
<Route path="security/devices/me" element={<Navigate to="/security/2fa?section=mine" replace />} />
<Route path="security/devices" element={<Navigate to="/security/2fa?section=devices" replace />} />
<Route path="*" element={lazyPage(<NotFoundPage />)} />
<Route path="*" element={<Navigate to={ROUTES.login} replace />} />
```


