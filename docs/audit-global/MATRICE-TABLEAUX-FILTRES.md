# Annexe — Matrice tableaux et filtres

Analyse statique de chaque composant contenant un tableau HTML ou des contrôles de filtrage/recherche.

| Module | Composant | Tables | Colonnes `<th>` | Recherche | Selects | Pagination | États chargement/erreur/vide | Sources/hooks |
|---|---|---:|---:|---|---:|---|---|---|
| activity | `ActivityPage.tsx` | 1 | 6 | oui | 7 | oui | isLoading, error, Aucun, Chargement | useActivityDetailQuery, useActivityOptionsQuery, useActivityQuery |
| auth | `TrustedDevicesPanel.tsx` | 0 | 0 | oui | 4 | oui | isLoading, isError, error, Aucun, Chargement | useTrustedDevices, useTwoFactorActions |
| auth | `TwoFactorSecurityCenterPage.tsx` | 0 | 0 | oui | 0 | non | isLoading, isError, error, Aucun, Chargement | useTwoFactorOverview |
| auth | `TwoFactorUsersPanel.tsx` | 0 | 0 | oui | 1 | oui | isLoading, isError, error, Aucun, Chargement | useTwoFactorManagedUsers |
| billing | `BillingPage.tsx` | 1 | 9 | oui | 2 | oui | isLoading, isError, error, Aucun, Chargement | useBillingConfigQuery, useInvoicesPageQuery |
| billing | `InvoiceDetailPage.tsx` | 1 | 6 | non | 1 | non | isLoading, isError, error, Aucun, Chargement | useBillingAction, useInvoiceQuery, useParams |
| billing | `InvoicePaymentComponents.tsx` | 1 | 9 | non | 1 | non | error, Aucun | useInvoicePayment, usePaymentMethodsQuery |
| billing | `NewInvoiceModal.tsx` | 1 | 6 | non | 5 | non | isLoading, isError, error, Chargement | useBillingConfigQuery, useCreateInvoice, useCustomersQuery, useSalesQuery |
| crm | `CrmPage.tsx` | 1 | 8 | oui | 7 | oui | isLoading, isError, error, Aucun, Chargement | useCancelQuotation, useCreateActivity, useCreateCrmAppointment, useCrmTeamMembersQuery, useLeadActivitiesQuery, useLeadQuotationsQuery, useLeadStageMutation, useLeadsPageQuery, useUpdateLead, useUpdateQuotation… |
| crm | `CrmTestDriveModal.tsx` | 0 | 0 | non | 1 | non | isLoading, isError, error, Aucun, Chargement | useCreateCrmTestDrive, useTestDriveConfigQuery, useVehiclesQuery |
| crm | `NewLeadModal.tsx` | 0 | 0 | oui | 5 | non | error, Aucun | useCreateLead, useCrmTeamMembersQuery, useLeadDuplicateCheck |
| crm | `QuotationModal.tsx` | 0 | 0 | non | 3 | non | isError, error | useCreateQuotation, useQuotationConfig, useVehiclesQuery |
| customers | `CustomerDetailPage.tsx` | 3 | 16 | non | 0 | oui | isLoading, isError, error, Aucun, Chargement | useCreateCustomerContact, useCustomer360Query, useEntityDocuments, useParams |
| customers | `CustomersListPage.tsx` | 1 | 7 | oui | 3 | non | isLoading, isError, error, Aucun, Chargement | useCreateCustomer, useCustomersQuery |
| dashboard | `DashboardPage.tsx` | 0 | 0 | non | 0 | oui | isLoading, isError, error, Aucun | useActiveRepairOrdersQuery, useDashboardOverviewQuery, useDeliveriesQuery, useNotificationActions, useNotificationsQuery |
| deliveries | `DeliveriesPage.tsx` | 1 | 6 | oui | 1 | oui | isLoading, isError, error, Aucun, Chargement | useDeferredValue, useDeliveriesPageQuery, useDeliveryCandidatesQuery, useDeliveryStatsQuery |
| deliveries | `DeliveryDetailPage.tsx` | 0 | 0 | non | 1 | non | isLoading, isError, error, Aucun, Chargement | useDeliveryActions, useDeliveryApplicableCategories, useDeliveryChecklist, useDeliveryDetailQuery, useMySignature, useParams, useRef, useServiceStamps, useSignDelivery, useVehicleReturnActions |
| deliveries | `DeliveryServicesPanel.tsx` | 0 | 0 | non | 1 | non | error, Aucun | useAddDeliveryService, useDeliveryServiceCatalog, useDeliveryServices |
| deliveries | `NewDeliveryModal.tsx` | 0 | 0 | non | 2 | non | error, Aucun | useCreateDelivery, useDeliveryCandidatesQuery, useDeliverySpecialistsQuery |
| documents | `DocumentsGedPage.tsx` | 1 | 1 | oui | 8 | oui | isLoading, isError, error, Aucun | useArchiveDocument, useDocumentEntitySearch, useDocumentReferences, useDocumentsQuery, useRestoreDocument, useUploadDocument |
| hr | `BonusesAdministration.tsx` | 1 | 5 | oui | 2 | oui | isLoading, Aucun, Chargement | useBonusesQuery |
| hr | `BudgetExpenseDisbursement.tsx` | 0 | 0 | non | 4 | non | error, Aucun | useEntityDocuments, useExpenseDisbursementsQuery, useHrActions, useTreasuryAccounts, useTreasuryCategories, useTreasuryManualOptions, useTreasuryReservations |
| hr | `EmployeeBonusesSection.tsx` | 0 | 0 | non | 1 | non | error, Aucun | useBonusTypesQuery, useEmployeeBonusesQuery, useEntityDocuments, useHrActions |
| hr | `EmployeeContractsSection.tsx` | 0 | 0 | non | 1 | non | error, Aucun | useEmployeeContractTypesQuery, useEmployeeContractsQuery, useEntityDocuments, useHrActions |
| hr | `EmployeeLeavesSection.tsx` | 0 | 0 | non | 1 | non | error, Aucun | useEmployeeLeavesQuery, useEntityDocuments, useHrActions, useLeaveTypesQuery |
| hr | `EmployeeRecordModal.tsx` | 0 | 0 | non | 2 | non | isLoading, error, Aucun, Chargement | useEligibleUsersQuery, useEmployeeQuery, useEntityDocuments, useHrActions |
| hr | `HrAdministrationPage.tsx` | 3 | 21 | oui | 18 | oui | isLoading, isError, error, Aucun, Chargement | useAgenciesQuery, useAllExpensesQuery, useBudgetApprovalHistoryQuery, useBudgetCategoriesQuery, useBudgetCategoryConcessionsQuery, useBudgetFundsQuery, useBudgetTargetsQuery, useBudgetsQuery, useClientPagination, useEmployeesQuery… |
| hr | `LeavesAdministration.tsx` | 1 | 5 | oui | 3 | oui | Aucun | useLeaveTypesQuery, useLeavesQuery |
| hr | `RemunerationsAdministration.tsx` | 0 | 0 | oui | 7 | oui | isLoading, isError, error, Aucun, Chargement | useClientPagination, useExpenseDisbursementsQuery, useMutation, useQuery, useQueryClient, useTreasuryAccounts, useTreasuryCategories, useTreasuryReservations |
| modules-portal | `ModulesPortalPage.tsx` | 0 | 0 | oui | 0 | non | non explicite | useDashboardOverviewQuery |
| notifications | `NotificationsPage.tsx` | 0 | 0 | non | 0 | oui | isLoading, isError, error, Aucun | useNotificationActions, useNotificationsQuery |
| parts | `PartLocationsPanel.tsx` | 1 | 5 | non | 2 | non | isError, error, Aucun, Chargement | usePartLocationAgenciesQuery, usePartLocationsQuery, useSavePartLocation |
| parts | `PartsWorkQueuePage.tsx` | 1 | 6 | non | 2 | non | isLoading, isError, error, Aucun, Chargement | useParams, usePartsWorkOrderQuery, usePartsWorkQueueQuery, useRepairAvailablePartsQuery, useRepairOrderActions, useRepairPartStocksQuery |
| parts | `SparePartDetailPage.tsx` | 3 | 19 | non | 2 | oui | isLoading, isError, error, Aucun, Chargement | useParams, usePartAction, usePartDetailQuery, usePartMovementsQuery |
| parts | `SparePartsPage.tsx` | 3 | 21 | oui | 4 | oui | isError, error, Aucun, Chargement | useCreatePart, useCreatePurchaseOrder, usePartCategoriesQuery, usePartReferencesQuery, usePartsPageQuery, usePartsQuery, usePurchaseOrderStatus, usePurchaseOrdersQuery, useReceivePurchaseOrder, useSavePartCategory |
| parts | `SupplierInvoicesPanel.tsx` | 1 | 9 | non | 4 | non | error, Aucun | useSupplierInvoiceActions, useSupplierInvoiceDetail, useSupplierInvoiceIndicators, useSupplierInvoiceOptions, useSupplierInvoicesQuery, useTreasuryAccounts, useTreasuryCategories, useTreasuryReservations |
| reports | `FinancialReportPanel.tsx` | 0 | 0 | oui | 1 | non | isLoading, isError, error, Aucun | useFinancialReportQuery |
| reports | `ReportsPage.tsx` | 4 | 24 | oui | 5 | non | isLoading, isError, error, Aucun | useAgencyReportQuery, useFinanceReportQuery, useMarginProvenanceQuery, usePartsReportQuery, useReportsOverviewQuery, useRevenueReportQuery, useSalesReportQuery, useSalespeopleReportQuery, useVehicleReportQuery, useWarrantyProvidersQuery… |
| sales | `SaleDetailPage.tsx` | 1 | 2 | non | 0 | non | isLoading, error, Aucun, Chargement | useDeliveryFinancialAuthorizations, useInvoiceQuery, useParams, useSaleDetailQuery, useSaleStatusMutation, useUpdateSale, useUpdateSaleWarranty |
| sales | `SaleWizardModal.tsx` | 0 | 0 | oui | 4 | oui | isLoading, error, Aucun, Chargement | useCreateSale, useCustomersQuery, useSaleDirectTaxConfigQuery, useSaleVehiclePricingGuardQuery, useUsersQuery, useVehicleWarrantyProposalQuery, useVehiclesQuery |
| sales | `SalesListPage.tsx` | 2 | 15 | oui | 1 | oui | isLoading, isError, error, Aucun, Chargement | useQuotationsPageQuery, useSalesPageQuery |
| service | `ExternalCustomersPanel.tsx` | 2 | 13 | oui | 0 | oui | isLoading, isError, error, Aucun, Chargement | useExternalWorkshopCustomerDetailQuery, useExternalWorkshopCustomersQuery |
| service | `NewRepairOrderModal.tsx` | 0 | 0 | oui | 5 | non | isError, error, Aucun, Chargement | useAdvisorCandidatesQuery, useCreateCustomer, useCreateRepairOrder, useCreateWorkshopExternalVehicle, useCreateWorkshopVehicleAssociation, useCustomer, useCustomerServiceVehiclesQuery, useExternalCustomer, useExternalVehicle, useRepairOrderCustomersQuery… |
| service | `RepairOrderDetailPage.tsx` | 2 | 11 | non | 14 | non | isLoading, isError, error, Aucun, Chargement | useAddRepairItem, useAssignRepairOrder, useInvoicePaymentsQuery, useInvoiceRepairOrder, useParams, useRef, useRepairAbandonmentActions, useRepairAbandonmentImpactQuery, useRepairAvailablePartsQuery, useRepairDetailQuery… |
| service | `ServiceDashboardPage.tsx` | 1 | 8 | oui | 1 | oui | isLoading, isError, error, Aucun, Chargement | useRepairOrdersPageQuery, useRepairStatsQuery |
| service | `WarrantyCard.tsx` | 1 | 4 | non | 2 | non | error, Aucun | usePaymentMethodsQuery, useRepairOrderActions, useWarrantyClaimPayment |
| settings | `DocumentMarksSettings.tsx` | 0 | 0 | non | 4 | non | error | useDocumentMarkAdministration, useDocumentMarkPolicies, useDocumentMarkTypes, useMySignature, useServiceStamps, useSignatureActions, useStampActions, useStampCategories |
| settings | `DocumentReferencesSettings.tsx` | 0 | 0 | non | 2 | non | error | useDocumentReferenceActions, useDocumentReferencesSettings |
| settings | `ManufacturersSettings.tsx` | 0 | 0 | non | 1 | non | isError, error, Aucun, Chargement | useManufacturerActions, useManufacturersQuery |
| settings | `OperationalResourcesSettings.tsx` | 0 | 0 | oui | 0 | non | isError, error, Aucun | useBaySettingsActions, useSettingsBaysQuery, useSupplierSettingsActions, useSuppliersSettingsQuery |
| settings | `VehicleLocationsSettings.tsx` | 0 | 0 | non | 4 | non | isLoading, error, Aucun | useSettingsAgenciesQuery, useVehicleLocationActions, useVehicleLocationsQuery |
| settings | `WorkshopLaborRatesSettings.tsx` | 1 | 6 | non | 1 | non | isLoading, isError, error, Aucun, Chargement | useSettingsAgenciesQuery, useWorkshopLaborRateActions, useWorkshopLaborRatesQuery |
| showroom | `ShowroomPage.tsx` | 1 | 10 | oui | 8 | oui | isLoading, isError, error, Aucun, Chargement | useCreateShowroomVisit, useDeferredValue, useShowroomActions, useShowroomBoardQuery, useShowroomCreateAgenciesQuery, useShowroomDetection, useShowroomSalesCandidatesQuery, useShowroomVisitQuery, useTestDriveConfigQuery, useVehiclesQuery |
| treasury | `BankReconciliationPanel.tsx` | 1 | 6 | non | 1 | oui | isLoading, error, Aucun | useBankProposals, useBankReconciliationActions, useBankStatement, useBankStatementHistory, useBankStatements, useClientPagination, useTreasuryAccounts |
| treasury | `BudgetTreasuryPanel.tsx` | 0 | 0 | non | 0 | oui | isLoading, error | useBudgetApprovalHistoryQuery, useBudgetFundRequestsQuery, useBudgetsQuery, useClientPagination, useHrActions, useTreasuryBudgetIndicators |
| treasury | `TreasuryFlowMappingsTable.tsx` | 1 | 6 | non | 1 | oui | error, Aucun | useClientPagination, useTreasuryFlowActions |
| treasury | `TreasuryPage.tsx` | 0 | 0 | oui | 18 | oui | isLoading, isError, error, Aucun, Chargement | useClientPagination, useTreasuryAccountTerritories, useTreasuryAccounts, useTreasuryActions, useTreasuryBudgetIndicators, useTreasuryCategories, useTreasuryCoverage, useTreasuryFlowConfiguration, useTreasuryJournal, useTreasuryManualOptions… |
| users | `RoleManagementPanel.tsx` | 1 | 4 | non | 2 | non | error, Aucun, Chargement | usePermissionsCatalogQuery, useRoleActions, useRolePermissionsQuery, useRoleStamps, useRolesQuery, useSaveRoleStamps |
| users | `TwoFactorAdministration.tsx` | 0 | 0 | oui | 1 | oui | isLoading, isError, error, Aucun, Chargement | useAdminTwoFactorStatus, useTwoFactorActions, useTwoFactorRolePolicies |
| users | `UsersManagementPage.tsx` | 1 | 7 | oui | 5 | oui | isLoading, error, Chargement | useAgenciesQuery, useRolesQuery, useUserActions, useUsersAdminQuery |
| vehicle-returns | `VehicleReturnPage.tsx` | 0 | 0 | non | 2 | non | isLoading, error, Chargement | useParams, useVehicleReturnActions, useVehicleReturnOptions, useVehicleReturnQuery |
| vehicles | `EditVehicleModal.tsx` | 0 | 0 | non | 2 | non | error | useUpdateVehicle, useVehicleReferencesQuery |
| vehicles | `NewVehicleModal.tsx` | 0 | 0 | non | 7 | non | error, Aucun | useCreateVehicle, useRef, useVehicleCreateAgenciesQuery, useVehicleReferencesQuery |
| vehicles | `VehicleDetailPage.tsx` | 0 | 0 | non | 1 | non | isLoading, isError, error, Aucun, Chargement | useParams, useVehicle360Query, useVehicleImages, useVehicleStatusMutation |
| vehicles | `VehicleTransferModal.tsx` | 0 | 0 | non | 2 | non | error | useVehicleTransfer, useVehicleTransferAgenciesQuery, useVehicleTransferLocationsQuery |
| vehicles | `VehiclesListPage.tsx` | 1 | 9 | oui | 8 | oui | isLoading, isError, error, Aucun, Chargement | useDeferredValue, useVehicleFilterOptionsQuery, useVehicleListQuery, useVehicleLocationCountsQuery, useVehicleStatsQuery |
| workshop | `WorkshopPlanningPage.tsx` | 1 | 8 | non | 8 | oui | isLoading, error, Aucun | useAssignRepairOrder, useRepairOrdersQuery, useTechniciansQuery, useWorkshopBaysQuery, useWorkshopInterventionHistoryPageQuery, useWorkshopPlanningQuery, useWorkshopScheduleMutation, useWorkshopStatsQuery, useWorkshopUnavailabilitiesQuery, useWorkshopUnavailabilityMutation |

## Points de contrôle

La présence d’un contrôle ne démontre pas son efficacité serveur. Les incohérences confirmées ou suspectes sont référencées dans le catalogue des anomalies et dans les sections module du rapport principal.


