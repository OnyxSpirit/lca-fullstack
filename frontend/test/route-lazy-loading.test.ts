import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const fallbackSource=app.slice(app.indexOf('function RouteLoadingFallback'),app.indexOf('const lazyPage'));

test('toutes les pages déclarées sont chargées par import dynamique',()=>{
  const pages=['DashboardPage','ModulesPortalPage','CrmPage','ShowroomPage','VehiclesListPage','VehicleDetailPage','SalesListPage','SaleDetailPage','DeliveriesPage','DeliveryDetailPage','VehicleReturnPage','CustomersListPage','CustomerDetailPage','ServiceDashboardPage','RepairOrderDetailPage','WorkshopPlanningPage','SparePartsPage','SparePartDetailPage','BillingPage','InvoiceDetailPage','TreasuryPage','ReportsPage','DocumentsGedPage','HrAdministrationPage','UsersManagementPage','SettingsPage','NotificationsPage','ActivityPage','LoginPage','NotFoundPage'];
  for(const page of pages){
    assert.match(app,new RegExp(`const ${page}=lazy\\(\\(\\)=>import\\(`),`${page} doit être lazy`);
    assert.doesNotMatch(app,new RegExp(`import \\{ ${page} \\} from`),`${page} ne doit plus être importée statiquement`);
  }
});

test('Suspense fournit un fallback accessible sans navigation ni déconnexion',()=>{
  assert.match(app,/Suspense fallback={<RouteLoadingFallback\/>}/);
  assert.match(app,/role="status" aria-live="polite"/);
  assert.match(app,/Chargement du module…/);
  assert.doesNotMatch(fallbackSource,/logout\(/);
  assert.doesNotMatch(fallbackSource,/Navigate/);
});

test('bootstrap, layout et gardes RBAC restent synchrones et hors des pages lazy',()=>{
  for(const eager of ['AppLayout','useAuthStore','AppBootstrap','AccessDeniedPage','RouteErrorBoundary'])assert.match(app,new RegExp(`import .*${eager}.* from`));
  assert.match(app,/<AppBootstrap \/>/);
  assert.match(app,/function ProtectedLayout/);
  assert.match(app,/function ModuleGuard/);
  assert.match(app,/can\(MODULE_PERMISSION\[module\]\)\?<>{children}<\/>:<AccessDeniedPage\/>/);
});

test('les routes profondes et leurs gardes conservent leurs chemins',()=>{
  const guarded:[string,string][]=[['vehicles/:id','vehicles'],['sales/:id','sales'],['deliveries/:id','deliveries'],['vehicle-returns/:id','deliveries'],['customers/:id','customers'],['service/repair-orders/:id','service'],['parts/:id','parts'],['billing/:id','billing']];
  for(const [path,module] of guarded)assert.match(app,new RegExp(`path="${path.replace('/','\\/')}" element={<ModuleGuard module="${module}">`));
  assert.match(app,/state={{ from: location }}/);
});

test('RouteErrorBoundary englobe les routes et traite les rejets de chunks sans reload automatique',()=>{
  assert.match(app,/<RouteErrorBoundary>[\s\S]*<Routes>/);
  assert.doesNotMatch(app,/location\.reload|window\.reload/);
});
