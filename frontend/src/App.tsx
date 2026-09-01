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

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  return isAuthenticated ? <AppLayout /> : <Navigate to={ROUTES.login} state={{ from: location }} replace />;
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
          <Route path="crm" element={<CrmPage />} />
          <Route path="showroom" element={<ShowroomPage />} />
          <Route path="vehicles" element={<VehiclesListPage />} />
          <Route path="vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="sales" element={<SalesListPage />} />
          <Route path="sales/:id" element={<SaleDetailPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
          <Route path="customers" element={<CustomersListPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="service" element={<ServiceDashboardPage />} />
          <Route path="service/repair-orders/:id" element={<RepairOrderDetailPage />} />
          <Route path="workshop" element={<WorkshopPlanningPage />} />
          <Route path="parts" element={<SparePartsPage />} />
          <Route path="parts/:id" element={<SparePartDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="documents" element={<DocumentsGedPage />} />
          <Route path="users" element={<UsersManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
