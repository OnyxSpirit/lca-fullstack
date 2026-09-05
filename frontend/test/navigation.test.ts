import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { detailRoutes, MODULE_ROUTES, notificationRoute, ROUTES } from '../src/navigation/routes';
import { canAccessModule } from '../src/navigation/permissions';
import type { UserRole } from '../src/types';

const roles: UserRole[] = ['SUPER_ADMIN','DIRECTION','SALES_MANAGER','SALES_REP','RECEPTIONIST','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_CHIEF','TECHNICIAN','PARTS_MANAGER','WAREHOUSE_CLERK','DELIVERY_MANAGER','ACCOUNTANT'];

test('chaque module possède une route absolue et unique', () => {
  const paths = MODULE_ROUTES.map((route) => route.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.every((path) => path.startsWith('/')));
  assert.equal(paths.length, Object.keys(ROUTES).length - 1);
});

test('les routes profondes liste → détail sont encodées', () => {
  assert.equal(detailRoutes.customer('A/B'), '/customers/A%2FB');
  assert.equal(detailRoutes.vehicle('42'), '/vehicles/42');
  assert.equal(detailRoutes.sale('42'), '/sales/42');
  assert.equal(detailRoutes.delivery('42'), '/deliveries/42');
  assert.equal(detailRoutes.repairOrder('42'), '/service/repair-orders/42');
  assert.equal(detailRoutes.part('42'), '/parts/42');
  assert.equal(detailRoutes.invoice('42'), '/billing/42');
});

test('les notifications ouvrent uniquement des écrans déclarés', () => {
  assert.equal(notificationRoute('sale', '7'), '/sales/7');
  assert.equal(notificationRoute('delivery', '7'), '/deliveries/7');
  assert.equal(notificationRoute('repair_order', '7'), '/service/repair-orders/7');
  assert.equal(notificationRoute('invoice', '7'), '/billing/7');
  assert.equal(notificationRoute('unknown', '7'), ROUTES.notifications);
});

test('dashboard, portail et notifications restent visibles pour les 13 rôles', () => {
  for (const role of roles) for (const module of ['dashboard', 'modules', 'notifications']) assert.equal(canAccessModule(role, 'view', module), true, `${role} doit voir ${module}`);
});

test('les permissions métier représentatives sont cloisonnées', () => {
  assert.equal(canAccessModule('SALES_REP', 'view', 'sales'), true);
  assert.equal(canAccessModule('TECHNICIAN', 'view', 'workshop'), true);
  assert.equal(canAccessModule('ACCOUNTANT', 'view', 'billing'), true);
  assert.equal(canAccessModule('RECEPTIONIST', 'view', 'settings'), false);
  assert.equal(canAccessModule('WAREHOUSE_CLERK', 'view', 'users'), false);
});

test('une route inconnue affiche une page 404 explicite', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /path="\*" element={<NotFoundPage \/>}/);
  assert.doesNotMatch(app, /path="\*" element={<Navigate to="\/dashboard"/);
});

test('la route demandée est conservée pendant la connexion', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const login = readFileSync(new URL('../src/modules/auth/LoginPage.tsx', import.meta.url), 'utf8');
  assert.match(app, /state={{ from: location }}/);
  assert.match(login, /navigate\(destination, { replace: true }\)/);
});

test('le modal OR fermé ne peut plus déclencher une boucle de rendu', () => {
  const modal = readFileSync(new URL('../src/modules/service/NewRepairOrderModal.tsx', import.meta.url), 'utf8');
  assert.match(modal, /if \(!isOpen\) return;/);
  assert.match(modal, /return current;/);
  assert.doesNotMatch(modal, /\[customers,vehicles,technicians\]/);
});

test('les compteurs notifications utilisent unreadCount serveur',()=>{const header=readFileSync(new URL('../src/components/layout/Header.tsx',import.meta.url),'utf8'),sidebar=readFileSync(new URL('../src/components/layout/Sidebar.tsx',import.meta.url),'utf8');assert.match(header,/unreadCount/);assert.match(sidebar,/unreadCount/);assert.doesNotMatch(sidebar,/badge: (8|20|3|2)/);assert.doesNotMatch(sidebar,/2 Alertes/);});

test('Header et Dashboard marquent une notification avant navigation',()=>{const header=readFileSync(new URL('../src/components/layout/Header.tsx',import.meta.url),'utf8'),dashboard=readFileSync(new URL('../src/modules/dashboard/DashboardPage.tsx',import.meta.url),'utf8');assert.match(header,/markAsRead\.mutateAsync/);assert.match(dashboard,/markAsRead\.mutateAsync/);});
test('les permissions utilisent tous les rôles et les routes sensibles possèdent un garde',()=>{assert.equal(canAccessModule(['TECHNICIAN','ACCOUNTANT'],'view','billing'),true);const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8'),store=readFileSync(new URL('../src/stores/authStore.ts',import.meta.url),'utf8');assert.match(app,/function ModuleGuard/);for(const module of ['users','billing','reports','documents'])assert.match(app,new RegExp(`ModuleGuard module="${module}"`));assert.match(app,/AccessDeniedPage/);assert.match(store,/currentUser\.roles/);assert.match(store,/canAccessModule\(currentUser\.roles/)});
test('l’administration et l’annuaire Users sont séparés',()=>{const hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8'),admin=readFileSync(new URL('../src/api/userHooks.ts',import.meta.url),'utf8');assert.match(hooks,/\/users\/directory/);assert.match(admin,/\/users\?/);assert.match(admin,/\/users\/:id\/status|`\/users\/\$\{id\}\/status`/)});
test('Paramètres possède un garde admin et des hooks dédiés typés',()=>{const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8'),hooks=readFileSync(new URL('../src/api/settingHooks.ts',import.meta.url),'utf8');assert.match(app,/ModuleGuard module="settings"/);assert.match(hooks,/interface ConcessionSettings/);assert.match(hooks,/interface WorkshopRates/);assert.doesNotMatch(hooks,/apiRequest<any>/);});
test('l’écran Paramètres ne simule aucune intégration et édite T1 à T4',()=>{const page=readFileSync(new URL('../src/modules/settings/SettingsPage.tsx',import.meta.url),'utf8');for(const code of ['T1','T2','T3','T4'])assert.match(page,new RegExp(`'${code}'`));assert.match(page,/Aucune intégration configurée/);assert.doesNotMatch(page,/Connecté|Certifié|SIRET|TVA Intracommunautaire/);assert.match(page,/Identifiant fiscal \/ NIU/);});
test('l’atelier sélectionne les barèmes backend sans TVA codée en dur',()=>{const page=readFileSync(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');assert.match(page,/useWorkshopConfigQuery/);assert.match(page,/rateCode:'T1'/);assert.doesNotMatch(page,/taxRate:18\.9/);});
test('les agences inactives sont exclues des nouvelles affectations utilisateur',()=>{const page=readFileSync(new URL('../src/modules/users/UsersManagementPage.tsx',import.meta.url),'utf8');assert.match(page,/filter\(a=>a\.isActive\)/);});
test('le wizard Vente ne contient plus de données de démonstration et protège le double submit',()=>{const wizard=readFileSync(new URL('../src/modules/sales/SaleWizardModal.tsx',import.meta.url),'utf8');for(const demo of ['Peugeot 308','Pack livraison confort','setDiscountTTC','setOptionsTotalTTC','hasTradeIn','registrationFeesTTC','administrativeFeesTTC'])assert.doesNotMatch(wizard,new RegExp(demo));assert.match(wizard,/idempotencyKey/);assert.match(wizard,/createSale\.isPending/);assert.match(wizard,/status==='active'/);assert.match(wizard,/status==='DISPONIBLE'/)});
test('les mutations Sales invalident ventes et véhicules',()=>{const hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');assert.match(hooks,/interface CreateSalePayload/);assert.match(hooks,/queryKey:erpKeys\.sales/);assert.match(hooks,/queryKey:erpKeys\.vehicles/)});
