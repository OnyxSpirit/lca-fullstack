import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const routes=source('src/modules/notifications/notification.routes.ts');
const service=source('src/modules/notifications/notification.service.ts');
const socket=source('src/realtime/socket.ts');
const showroom=source('src/modules/showroom/showroom.routes.ts');
const crm=source('src/modules/crm/crm.notifications.ts');

test('NOTIF-01 tous les endpoints personnels exigent notifications.view',()=>{
  assert.match(routes,/use\('\/notifications',requirePermission\('notifications\.view'\)\)/);
});

test('NOTIF-02 liste, compteur, lecture, read-all et suppression restent liés au user authentifié',()=>{
  assert.match(routes,/baseWhere=\[`user_id=\?`/);
  assert.match(routes,/WHERE user_id=\? AND channel='notification' AND read_at IS NULL/);
  assert.match(routes,/WHERE id=\? AND user_id=\? AND channel='notification'/);
  assert.match(routes,/COALESCE\(read_at,NOW\(\)\)/);
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
  assert.ok(service.indexOf('INSERT IGNORE INTO notifications')<service.indexOf("emitToUser(input.userId,'notifications:created'"));
});

test('NOTIF-05 la sélection collective dépend des permissions/scopes et du vrai Super Admin système',()=>{
  assert.match(service,/p\.code IN \(\$\{marks\}\)/);
  assert.match(service,/rp\.scope='GLOBAL'/);
  assert.match(service,/rp\.scope='CONCESSION'/);
  assert.match(service,/rp\.scope='AGENCY'/);
  assert.match(service,/r\.code='SUPER_ADMIN' AND r\.is_system=TRUE/);
  assert.doesNotMatch(service,/notifyRoles|roles:string\[\]/);
});

test('NOTIF-06 les rooms privées et le payload temps réel sont minimaux',()=>{
  assert.match(socket,/to\(`user:\$\{userId\}`\)\.emit/);
  assert.doesNotMatch(service,/customer:|token:|password:/);
  assert.doesNotMatch(service,/userId:input\.userId/);
});

test('NOTIF-07 authentification socket relit utilisateur actif, agence et Super Admin système',()=>{
  assert.match(socket,/u\.id=\? AND u\.is_active=TRUE/);
  assert.match(socket,/r\.is_system=TRUE/);
  assert.match(socket,/agencyId:String\(active\.agency_id\)/);
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
