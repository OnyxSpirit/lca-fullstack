import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { ModulesPortalPage } from './modules/modules-portal/ModulesPortalPage';
import { CrmPage } from './modules/crm/CrmPage';
import { ShowroomPage } from './modules/showroom/ShowroomPage';
import { VehiclesListPage } from './modules/vehicles/VehiclesListPage';
import { VehicleDetailPage } from './modules/vehicles/VehicleDetailPage';
import { SalesListPage } from './modules/sales/SalesListPage';
import { SaleDetailPage } from './modules/sales/SaleDetailPage';
import { DeliveriesPage } from './modules/deliveries/DeliveriesPage';
import { CustomersListPage } from './modules/customers/CustomersListPage';
import { CustomerDetailPage } from './modules/customers/CustomerDetailPage';
import { ServiceDashboardPage } from './modules/service/ServiceDashboardPage';
import { RepairOrderDetailPage } from './modules/service/RepairOrderDetailPage';
import { WorkshopPlanningPage } from './modules/workshop/WorkshopPlanningPage';
import { SparePartsPage } from './modules/parts/SparePartsPage';
import { BillingPage } from './modules/billing/BillingPage';
import { InvoiceDetailPage } from './modules/billing/InvoiceDetailPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { DocumentsGedPage } from './modules/documents/DocumentsGedPage';
import { UsersManagementPage } from './modules/users/UsersManagementPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { NotificationsPage } from './modules/notifications/NotificationsPage';
import { DeliveryDetailPage } from './modules/deliveries/DeliveryDetailPage';
import { SparePartDetailPage } from './modules/parts/SparePartDetailPage';
import { LoginPage } from './modules/auth/LoginPage';
import { useAuthStore } from './stores/authStore';
import { AppBootstrap } from './components/AppBootstrap';
import { NotFoundPage } from './modules/errors/NotFoundPage';
import { ROUTES } from './navigation/routes';
import { canAccessModule } from './navigation/permissions';
import type { ModuleKey } from './navigation/routes';
import { AccessDeniedPage } from './modules/errors/AccessDeniedPage';

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  return isAuthenticated ? <AppLayout /> : <Navigate to={ROUTES.login} state={{ from: location }} replace />;
}
function ModuleGuard({module,children}:{module:ModuleKey;children:React.ReactNode}) {
  const user=useAuthStore(state=>state.currentUser);
  const roles=user?.roles?.length?user.roles:user?[user.role]:[];
  return canAccessModule(roles,'view',module)?<>{children}</>:<AccessDeniedPage/>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppBootstrap />
      <Routes>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="modules" element={<ModulesPortalPage />} />
          <Route path="crm" element={<ModuleGuard module="crm"><CrmPage /></ModuleGuard>} />
          <Route path="showroom" element={<ModuleGuard module="showroom"><ShowroomPage /></ModuleGuard>} />
          <Route path="vehicles" element={<ModuleGuard module="vehicles"><VehiclesListPage /></ModuleGuard>} />
          <Route path="vehicles/:id" element={<ModuleGuard module="vehicles"><VehicleDetailPage /></ModuleGuard>} />
          <Route path="sales" element={<ModuleGuard module="sales"><SalesListPage /></ModuleGuard>} />
          <Route path="sales/:id" element={<ModuleGuard module="sales"><SaleDetailPage /></ModuleGuard>} />
          <Route path="deliveries" element={<ModuleGuard module="deliveries"><DeliveriesPage /></ModuleGuard>} />
          <Route path="deliveries/:id" element={<ModuleGuard module="deliveries"><DeliveryDetailPage /></ModuleGuard>} />
          <Route path="customers" element={<ModuleGuard module="customers"><CustomersListPage /></ModuleGuard>} />
          <Route path="customers/:id" element={<ModuleGuard module="customers"><CustomerDetailPage /></ModuleGuard>} />
          <Route path="service" element={<ModuleGuard module="service"><ServiceDashboardPage /></ModuleGuard>} />
          <Route path="service/repair-orders/:id" element={<ModuleGuard module="service"><RepairOrderDetailPage /></ModuleGuard>} />
          <Route path="workshop" element={<ModuleGuard module="workshop"><WorkshopPlanningPage /></ModuleGuard>} />
          <Route path="parts" element={<ModuleGuard module="parts"><SparePartsPage /></ModuleGuard>} />
          <Route path="parts/:id" element={<ModuleGuard module="parts"><SparePartDetailPage /></ModuleGuard>} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="billing" element={<ModuleGuard module="billing"><BillingPage /></ModuleGuard>} />
          <Route path="billing/:id" element={<ModuleGuard module="billing"><InvoiceDetailPage /></ModuleGuard>} />
          <Route path="reports" element={<ModuleGuard module="reports"><ReportsPage /></ModuleGuard>} />
          <Route path="documents" element={<ModuleGuard module="documents"><DocumentsGedPage /></ModuleGuard>} />
          <Route path="users" element={<ModuleGuard module="users"><UsersManagementPage /></ModuleGuard>} />
          <Route path="settings" element={<ModuleGuard module="settings"><SettingsPage /></ModuleGuard>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
