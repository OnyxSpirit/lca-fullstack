import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ROUTES } from './navigation/routes';
import type { ModuleKey } from './navigation/routes';
import { AccessDeniedPage } from './modules/errors/AccessDeniedPage';
import { RouteErrorBoundary } from './components/layout/RouteErrorBoundary';

const DashboardPage=lazy(()=>import('./modules/dashboard/DashboardPage').then(module=>({default:module.DashboardPage})));
const ModulesPortalPage=lazy(()=>import('./modules/modules-portal/ModulesPortalPage').then(module=>({default:module.ModulesPortalPage})));
const CrmPage=lazy(()=>import('./modules/crm/CrmPage').then(module=>({default:module.CrmPage})));
const ShowroomPage=lazy(()=>import('./modules/showroom/ShowroomPage').then(module=>({default:module.ShowroomPage})));
const VehiclesListPage=lazy(()=>import('./modules/vehicles/VehiclesListPage').then(module=>({default:module.VehiclesListPage})));
const VehicleDetailPage=lazy(()=>import('./modules/vehicles/VehicleDetailPage').then(module=>({default:module.VehicleDetailPage})));
const SalesListPage=lazy(()=>import('./modules/sales/SalesListPage').then(module=>({default:module.SalesListPage})));
const SaleDetailPage=lazy(()=>import('./modules/sales/SaleDetailPage').then(module=>({default:module.SaleDetailPage})));
const DeliveriesPage=lazy(()=>import('./modules/deliveries/DeliveriesPage').then(module=>({default:module.DeliveriesPage})));
const DeliveryDetailPage=lazy(()=>import('./modules/deliveries/DeliveryDetailPage').then(module=>({default:module.DeliveryDetailPage})));
const VehicleReturnPage=lazy(()=>import('./modules/vehicle-returns/VehicleReturnPage').then(module=>({default:module.VehicleReturnPage})));
const CustomersListPage=lazy(()=>import('./modules/customers/CustomersListPage').then(module=>({default:module.CustomersListPage})));
const CustomerDetailPage=lazy(()=>import('./modules/customers/CustomerDetailPage').then(module=>({default:module.CustomerDetailPage})));
const ServiceDashboardPage=lazy(()=>import('./modules/service/ServiceDashboardPage').then(module=>({default:module.ServiceDashboardPage})));
const RepairOrderDetailPage=lazy(()=>import('./modules/service/RepairOrderDetailPage').then(module=>({default:module.RepairOrderDetailPage})));
const WorkshopPlanningPage=lazy(()=>import('./modules/workshop/WorkshopPlanningPage').then(module=>({default:module.WorkshopPlanningPage})));
const SparePartsPage=lazy(()=>import('./modules/parts/SparePartsPage').then(module=>({default:module.SparePartsPage})));
const SparePartDetailPage=lazy(()=>import('./modules/parts/SparePartDetailPage').then(module=>({default:module.SparePartDetailPage})));
const BillingPage=lazy(()=>import('./modules/billing/BillingPage').then(module=>({default:module.BillingPage})));
const InvoiceDetailPage=lazy(()=>import('./modules/billing/InvoiceDetailPage').then(module=>({default:module.InvoiceDetailPage})));
const TreasuryPage=lazy(()=>import('./modules/treasury/TreasuryPage').then(module=>({default:module.TreasuryPage})));
const ReportsPage=lazy(()=>import('./modules/reports/ReportsPage').then(module=>({default:module.ReportsPage})));
const DocumentsGedPage=lazy(()=>import('./modules/documents/DocumentsGedPage').then(module=>({default:module.DocumentsGedPage})));
const HrAdministrationPage=lazy(()=>import('./modules/hr/HrAdministrationPage').then(module=>({default:module.HrAdministrationPage})));
const UsersManagementPage=lazy(()=>import('./modules/users/UsersManagementPage').then(module=>({default:module.UsersManagementPage})));
const SettingsPage=lazy(()=>import('./modules/settings/SettingsPage').then(module=>({default:module.SettingsPage})));
const NotificationsPage=lazy(()=>import('./modules/notifications/NotificationsPage').then(module=>({default:module.NotificationsPage})));
const ActivityPage=lazy(()=>import('./modules/activity/ActivityPage').then(module=>({default:module.ActivityPage})));
const LoginPage=lazy(()=>import('./modules/auth/LoginPage').then(module=>({default:module.LoginPage})));
const NotFoundPage=lazy(()=>import('./modules/errors/NotFoundPage').then(module=>({default:module.NotFoundPage})));
const AppLayout=lazy(()=>import('./components/layout/AppLayout').then(module=>({default:module.AppLayout})));

function RouteLoadingFallback(){
  return <div className="min-h-[55vh] grid place-items-center" role="status" aria-live="polite"><div className="flex items-center gap-3 text-sm font-medium text-slate-600"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#8f1722]" aria-hidden="true"/>Chargement du module…</div></div>;
}
const lazyPage=(element:React.ReactNode)=><Suspense fallback={<RouteLoadingFallback/>}>{element}</Suspense>;

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  return isAuthenticated ? lazyPage(<AppLayout />) : <Navigate to={ROUTES.login} state={{ from: location }} replace />;
}
function SessionBootstrap(){
  const logout=useAuthStore(state=>state.logout);
  useEffect(()=>{const expired=()=>logout();window.addEventListener('lca:session-expired',expired);return()=>window.removeEventListener('lca:session-expired',expired)},[logout]);
  return null;
}
const MODULE_PERMISSION: Record<ModuleKey, string> = { dashboard:'dashboard.view', modules:'dashboard.view', crm:'crm.prospect.view', showroom:'showroom.view', vehicles:'vehicles.view', sales:'sales.view', deliveries:'delivery.view', customers:'customers.view', service:'service.order.view', workshop:'workshop.view', parts:'parts.view', billing:'billing.view', treasury:'treasury.view', reports:'reporting.view', documents:'ged.view', hr:'hr.view', users:'users.view', settings:'settings.view', notifications:'notifications.view',activity:'activity.view' };
function ModuleGuard({module,children}:{module:ModuleKey;children:React.ReactNode}) {
  const can=useAuthStore(state=>state.can);
  return can(MODULE_PERMISSION[module])?<>{children}</>:<AccessDeniedPage/>;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteErrorBoundary>
      <SessionBootstrap />
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
          <Route path="parts/:id" element={<ModuleGuard module="parts">{lazyPage(<SparePartDetailPage />)}</ModuleGuard>} />
          <Route path="notifications" element={lazyPage(<NotificationsPage />)} />
          <Route path="billing" element={<ModuleGuard module="billing">{lazyPage(<BillingPage />)}</ModuleGuard>} />
          <Route path="billing/:id" element={<ModuleGuard module="billing">{lazyPage(<InvoiceDetailPage />)}</ModuleGuard>} />
          <Route path="treasury" element={<ModuleGuard module="treasury">{lazyPage(<TreasuryPage />)}</ModuleGuard>} />
          <Route path="reports" element={<ModuleGuard module="reports">{lazyPage(<ReportsPage />)}</ModuleGuard>} />
          <Route path="documents" element={<ModuleGuard module="documents">{lazyPage(<DocumentsGedPage />)}</ModuleGuard>} />
          <Route path="hr" element={<ModuleGuard module="hr">{lazyPage(<HrAdministrationPage />)}</ModuleGuard>} />
          <Route path="users" element={<ModuleGuard module="users">{lazyPage(<UsersManagementPage />)}</ModuleGuard>} />
          <Route path="settings" element={<ModuleGuard module="settings">{lazyPage(<SettingsPage />)}</ModuleGuard>} />
          <Route path="activity" element={<ModuleGuard module="activity">{lazyPage(<ActivityPage />)}</ModuleGuard>} />
          <Route path="*" element={lazyPage(<NotFoundPage />)} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
      </Routes>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}
