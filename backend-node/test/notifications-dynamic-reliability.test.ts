import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const routes=source('src/modules/notifications/notification.routes.ts');
const service=source('src/modules/notifications/notification.service.ts');
const socket=source('src/realtime/socket.ts');
const showroom=source('src/modules/showroom/showroom.routes.ts');
const crm=source('src/modules/crm/crm.notifications.ts');

test('NOTIF-01 les endpoints séparent consultation, lecture, archivage et suppression',()=>{
  assert.match(routes,/get\('\/notifications',requireAgencyBusinessPermission\('notifications\.view'\)/);
  assert.match(routes,/patch\('\/notifications\/read-all',requireAgencyBusinessPermission\('notifications\.update'\)/);
  assert.match(routes,/patch\('\/notifications\/:id\/read',requireNotificationId,requireAgencyBusinessPermission\('notifications\.update'\)/);
  assert.match(routes,/patch\('\/notifications\/:id\/archive',requireNotificationId,requireAgencyBusinessPermission\('notifications\.archive'\)/);
  assert.match(routes,/delete\('\/notifications\/:id',requireNotificationId,requireAgencyBusinessPermission\('notifications\.delete'\)/);
});

test('NOTIF-02 la liste dérive sa visibilité du RBAC et les mutations restent liées au user authentifié',()=>{
  assert.match(routes,/notificationVisibility\(request,request\.query\.scope\)/);
  assert.match(routes,/if\(requested==='agency'\)\{if\(scope!=='AGENCY'\)/);
  assert.match(routes,/n\.user_id=\? AND \(n\.operation_agency_id IS NULL OR n\.operation_agency_id=\?\)/);
  assert.match(routes,/WHERE user_id=\? AND \(operation_agency_id IS NULL OR operation_agency_id=\?\)/);
  assert.match(routes,/WHERE id=\? AND user_id=\? AND channel='notification'/);
  assert.match(routes,/authorizeAgencyResource\(request,permission,notificationId/);
  assert.match(routes,/COALESCE\(read_at,NOW\(\)\)/);
});

test('NOTIF-02B les opérations normales excluent archives et suppressions logiques',()=>{
  assert.match(routes,/baseWhere=\[visibility\.sql,`n\.channel='notification'`,`n\.archived_at IS NULL`,`n\.deleted_at IS NULL`\]/);
  assert.match(routes,/read_at IS NULL AND archived_at IS NULL AND deleted_at IS NULL/);
  assert.doesNotMatch(routes,/DELETE FROM notifications/);
  assert.match(routes,/action:`notification\.\$\{kind==='archive'\?'archived':'deleted'\}`/);
});

test('NOTIF-03 filtres SQL paramétrés, pagination bornée et ordre newest-first',()=>{
  assert.match(routes,/baseParams\.push/);
  assert.match(routes,/Math\.min\(100,Math\.max\(1/);
  assert.match(routes,/ORDER BY created_at DESC,id DESC LIMIT \? OFFSET \?/);
});

test('NOTIF-04 la création refuse cible inactive et contenu invalide puis persiste avant émission',()=>{
  assert.match(service,/u\.id=\? AND u\.is_active=TRUE/);
  assert.match(service,/p\.code='notifications\.view'/);
  assert.match(service,/Titre et message de notification requis/);
  assert.match(service,/Priorité de notification invalide/);
  assert.ok(service.indexOf('INSERT IGNORE INTO notifications')<service.indexOf("emitToUserAgencyContext(input.userId,context.operationAgencyId,'notifications:created'"));
});

test('NOTIF-05 la sélection collective dépend des permissions/scopes persistées',()=>{
  assert.match(service,/p\.code IN \(\$\{marks\}\)/);
  assert.match(service,/rp\.scope='GLOBAL'/);
  assert.match(service,/rp\.scope='CONCESSION'/);
  assert.match(service,/rp\.scope='AGENCY'/);
  assert.doesNotMatch(service,/SUPER_ADMIN/);
  assert.doesNotMatch(service,/notifyRoles|roles:string\[\]/);
});

test('NOTIF-06 les rooms privées et le payload temps réel sont minimaux',()=>{
  assert.match(socket,/to\(`user:\$\{userId\}`\)\.emit/);
  assert.match(socket,/context\?\.activeAgencyId===agencyId/);
  assert.doesNotMatch(service,/customer:|token:|password:/);
  assert.doesNotMatch(service,/userId:input\.userId/);
});

test('NOTIF-07 authentification socket relit utilisateur actif, agence et permissions persistées',()=>{
  assert.match(socket,/assertSessionCurrent\(claims\.sub,claims\.sid\)/);
  assert.match(socket,/resolveAgencyRbacContext\(claims\.sub,claims\.sid\)/);
  assert.match(socket,/assertSessionCurrent\(claims\.sub,claims\.sid\)/);
  assert.match(socket,/context\.permissions\.has\(permission\)/);
  assert.match(socket,/agency:\$\{context\.activeAgencyId\}/);
  assert.doesNotMatch(socket,/rooms\.add\('global'\)/);
  assert.doesNotMatch(socket,/roles\.some|DIRECTOR/);
});

test('NOTIF-08 la désactivation coupe immédiatement les sockets privés',()=>{
  const users=source('src/modules/users/user.service.ts');
  assert.match(socket,/disconnectUser/);
  assert.match(users,/if\(!value\)disconnectUser\(id\)/);
});

test('NOTIF-09 les producteurs nominatifs ciblent directement l’utilisateur sans rôle',()=>{
  assert.match(showroom,/createUserNotification\(\{userId,subject,message/);
  assert.match(crm,/createUserNotification\(\{userId:String\(input\.assignedUserId\)/);
  assert.doesNotMatch(crm,/roles:/);
});

test('NOTIF-10 Showroom ne notifie que si l’affectation change après verrou',()=>{
  assert.match(showroom,/FOR UPDATE/);
  assert.match(showroom,/if\(currentAssignee===assignee\)return false/);
  assert.match(showroom,/if\(changed\)await notify/);
});

test('NOTIF-11 aucun nom de rôle métier ne gouverne le service Notifications',()=>{
  for(const role of ['COMMERCIAL','RECEPTIONIST','DIRECTOR','MANAGER','TECHNICIAN'])assert.doesNotMatch(service,new RegExp(role));
});
