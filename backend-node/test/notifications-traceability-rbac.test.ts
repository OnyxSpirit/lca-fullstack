import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const routes=readFileSync(new URL('../src/modules/notifications/notification.routes.ts',import.meta.url),'utf8');

test('NOTIF-RBAC-02 sépare les permissions, ownership et audit transactionnel',()=>{
  assert.match(routes,/patch\('\/notifications\/:id\/read',requireNotificationId,requireAgencyBusinessPermission\('notifications\.update'\)/);
  assert.match(routes,/patch\('\/notifications\/:id\/archive',requireNotificationId,requireAgencyBusinessPermission\('notifications\.archive'\)/);
  assert.match(routes,/delete\('\/notifications\/:id',requireNotificationId,requireAgencyBusinessPermission\('notifications\.delete'\)/);
  assert.match(routes,/withCurrentAgencyAuthorization\(request/);
  assert.match(routes,/assertAgencyBusinessPermissionInContext\(context,permission\)/);
  assert.match(routes,/FOR UPDATE/);
  assert.match(routes,/WHERE id=\? AND user_id=\? AND channel='notification'/);
  assert.match(routes,/agencyIndependent:\(row:NotificationRow\)=>row\.operation_agency_id==null/);
  assert.match(routes,/writeAudit\(connection as PoolConnection,request/);
  assert.doesNotMatch(routes,/DELETE FROM notifications/);
});
