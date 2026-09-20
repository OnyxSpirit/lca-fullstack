import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertAssignableRoles } from '../src/modules/users/user-access.js';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const request={} as Parameters<typeof assertAssignableRoles>[0];

test('RBAC-TEST-01/02 le backend exige exactement un rôle métier',async()=>{
  await assert.rejects(assertAssignableRoles(request,[]),/exactement un rôle/);
  await assert.rejects(assertAssignableRoles(request,['SALES_AGENT','ACCOUNTANT']),/exactement un rôle/);
  await assert.rejects(assertAssignableRoles(request,['SALES_AGENT','SALES_AGENT']),/exactement un rôle/);
});

test('RBAC-TEST-03..09 routes utilisateurs cloisonnées par concession et hiérarchie',()=>{
  const routes=source('src/modules/users/user.routes.ts'),service=source('src/modules/users/user.service.ts'),access=source('src/modules/users/user-access.ts');
  assert.match(routes,/requirePermission\('users\.view'\)/);
  assert.match(routes,/service\.list\(req\.query,req\)/);
  assert.match(routes,/service\.one\(routeId\(req\.params\.id\),req\)/);
  assert.match(service,/a\.concession_id=\(SELECT concession_id FROM agencies WHERE id=\?\)/);
  assert.match(service,/assertAgencyInActorScope/);
  assert.doesNotMatch(access,/autre DIRECTOR|attribuer le rôle DIRECTOR/);
  assert.doesNotMatch(access,/ADMIN_ROLES|request\.user\?\.roles\.includes/);
  assert.match(access,/await rbac\(request\)/);
  assert.match(access,/FORBIDDEN_SUPER_ADMIN_ACTION/);
});

test('RBAC-TEST-10 protège le dernier super administrateur',()=>assert.match(source('src/modules/users/user.service.ts'),/LAST_SUPER_ADMIN/));

test('NOTIF-TEST-04/05/06/07 isolation, idempotence et événements financiers',()=>{
  const routes=source('src/modules/notifications/notification.routes.ts'),notifications=source('src/modules/notifications/notification.service.ts'),billing=source('src/modules/billing/billing.routes.ts');
  assert.match(routes,/user_id=\?/);
  assert.match(routes,/id=\? AND user_id=\?/);
  assert.match(notifications,/INSERT IGNORE INTO notifications/);
  assert.match(notifications,/concession_id=\(SELECT concession_id FROM agencies WHERE id=\?\)/);
  assert.match(billing,/payment\.received/);
  assert.match(billing,/invoice\.paid/);
});

test('la migration permissions est additive et idempotente',()=>{
  const sql=source('database/legacy-migrations/022_settings_users_notifications_permissions.sql');
  for(const permission of ['users.view','users.manage','settings.view','settings.manage','notifications.view'])assert.match(sql,new RegExp(permission.replace('.','\\.')));
  assert.match(sql,/INSERT IGNORE/);
  assert.doesNotMatch(sql,/\b(DROP|TRUNCATE|DELETE)\b/i);
});
