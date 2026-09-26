import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{notificationCategories,notificationScopesFor}from'../src/modules/notifications/notificationFilters';
import{createNotificationSignal,NOTIFICATION_TONE_DURATION_SECONDS,resetNotificationSignalForTests}from'../src/services/notificationSound';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('NOTIF-UX-01 conserve les catégories produites et délègue les portées au RBAC',()=>{
  assert.deepEqual(notificationScopesFor('OWN'),['mine']);
  assert.deepEqual(notificationCategories.map(([value])=>value),['lead','sale','showroom','vehicle','repair_order','delivery','invoice','payment']);
  const page=read('../src/modules/notifications/NotificationsPage.tsx');
  assert.match(page,/notificationScopesFor\(permissionScope\)/);
});

test('NOTIF-UX-01 sélectionne exactement une catégorie et transmet referenceType dans la query key',()=>{
  const page=read('../src/modules/notifications/NotificationsPage.tsx'),hooks=read('../src/api/notificationHooks.ts');
  assert.match(page,/variant=\{!referenceType\?'primary':'outline'\}/);
  assert.match(page,/setReferenceType\(value\)/);assert.doesNotMatch(page,/referenceType===value\?'':value/);
  assert.match(hooks,/list:notificationListKey/);assert.match(hooks,/Object\.entries\(filters\)/);
});

test('NOTIF-UX-01 déduplique le son par identifiant et absorbe un blocage audio',async()=>{
  resetNotificationSignalForTests();let played=0;const signal=createNotificationSignal(()=>{played++});
  assert.equal(signal.receive({id:'42'}),true);assert.equal(signal.receive({id:'42'}),false);assert.equal(signal.receive({id:'43'}),true);assert.equal(played,2);
  resetNotificationSignalForTests();const blocked=createNotificationSignal(()=>Promise.reject(new Error('autoplay')));assert.equal(blocked.receive({id:'44'}),true);await new Promise(resolve=>setTimeout(resolve,0));
});

test('NOTIF-SOUND-03 produit une enveloppe discrète de 800 ms avec attaque et fade-out',()=>{
  assert.equal(NOTIFICATION_TONE_DURATION_SECONDS,.8);
  const sound=read('../src/services/notificationSound.ts');
  assert.match(sound,/exponentialRampToValueAtTime\(\.05,now\+\.04\)/);
  assert.match(sound,/setValueAtTime\(\.05,now\+\.18\)/);
  assert.match(sound,/exponentialRampToValueAtTime\(\.0001,now\+NOTIFICATION_TONE_DURATION_SECONDS\)/);
  assert.match(sound,/oscillator\.stop\(now\+NOTIFICATION_TONE_DURATION_SECONDS\)/);
});

test('NOTIF-UX-01 réserve le son au seul événement realtime et nettoie le listener exact',()=>{
  const bootstrap=read('../src/components/AppBootstrap.tsx');
  assert.match(bootstrap,/socket\.on\('notifications:created',notificationCreated\)/);assert.match(bootstrap,/notificationSignal\.receive\(payload\)/);assert.match(bootstrap,/socket\.off\('notifications:created',notificationCreated\)/);
  assert.doesNotMatch(bootstrap,/'notifications:created': \['notifications'\]/);
});
