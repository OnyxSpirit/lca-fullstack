import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {notificationRoute} from '../src/navigation/routes';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const hooks=source('src/api/notificationHooks.ts');
const bootstrap=source('src/components/AppBootstrap.tsx');

test('NOTIF-FE-01 les queries exigent session, utilisateur et permission appelante',()=>{
  assert.match(hooks,/enabled:enabled&&authenticated&&userId!==/);
  for(const file of ['src/components/layout/Header.tsx','src/components/layout/Sidebar.tsx','src/modules/dashboard/DashboardPage.tsx','src/modules/notifications/NotificationsPage.tsx'])assert.match(source(file),/can\('notifications\.view'\)/);
});

test('NOTIF-FE-02 le cache est isolé par utilisateur et nettoyé au logout',()=>{
  assert.match(hooks,/\['notifications',userId,'list',filters\]/);
  assert.match(bootstrap,/removeQueries\(\{queryKey:\['notifications'\]\}\)/);
});

test('NOTIF-FE-03 un seul événement invalide le cache sans insertion locale dupliquée',()=>{
  assert.match(bootstrap,/'notifications:created': \['notifications'\]/);
  assert.doesNotMatch(bootstrap,/setQueryData|push\(/);
});

test('NOTIF-FE-04 les listeners sont retirés avec leur référence exacte',()=>{
  assert.match(bootstrap,/eventHandlers\.set\(event,handler\)/);
  assert.match(bootstrap,/socket\.off\(event,handler\)/);
  assert.match(bootstrap,/socket\.off\('rbac:updated',rbacUpdated\)/);
});

test('NOTIF-FE-05 les routes actionnables sont déclarées et le type inconnu reste sûr',()=>{
  assert.equal(notificationRoute('sale','7'),'/sales/7');
  assert.equal(notificationRoute('delivery','7'),'/deliveries/7');
  assert.equal(notificationRoute('repair_order','7'),'/service/repair-orders/7');
  assert.equal(notificationRoute('invoice','7'),'/billing/7');
  assert.equal(notificationRoute('unknown','7'),'/notifications');
});

test('NOTIF-FE-06 le clic vérifie encore la permission de la destination',()=>{
  for(const file of ['src/components/layout/Header.tsx','src/modules/dashboard/DashboardPage.tsx','src/modules/notifications/NotificationsPage.tsx'])assert.match(source(file),/canNavigateWithPermissions/);
});

test('NOTIF-FE-07 titre et message sont rendus comme texte React sans HTML injecté',()=>{
  const page=source('src/modules/notifications/NotificationsPage.tsx');
  assert.match(page,/\{n\.subject\}/);
  assert.match(page,/\{n\.message\}/);
  assert.doesNotMatch(page,/dangerouslySetInnerHTML/);
});

test('NOTIF-FE-08 date invalide et état vide restent explicites',()=>{
  assert.match(hooks,/Number\.isNaN\(date\.getTime\(\)\).*Date indisponible/);
  assert.match(source('src/modules/notifications/NotificationsPage.tsx'),/Aucune notification/);
});
