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
});

test('les notifications ouvrent uniquement des écrans déclarés', () => {
  assert.equal(notificationRoute('sale', '7'), '/sales/7');
  assert.equal(notificationRoute('delivery', '7'), '/deliveries/7');
  assert.equal(notificationRoute('repair_order', '7'), '/service/repair-orders/7');
  assert.equal(notificationRoute('invoice', '7'), ROUTES.billing);
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
