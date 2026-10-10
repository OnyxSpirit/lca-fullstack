import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{notificationCategories,notificationListKey,notificationScopesFor}from'../src/modules/notifications/notificationFilters';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('NOTIF-RBAC-02 dérive les boutons de la portée dynamique accordée',()=>{
  assert.deepEqual(notificationScopesFor(undefined),[]);
  assert.deepEqual(notificationScopesFor('OWN'),['mine']);
  assert.deepEqual(notificationScopesFor('AGENCY'),['mine','agency']);
  assert.deepEqual(notificationScopesFor('CONCESSION'),['mine','agency','concession']);
  assert.deepEqual(notificationScopesFor('GLOBAL'),['mine','agency','concession','global']);
});

test('NOTIF-RBAC-02 transmet la portée et l inclut dans la clé de cache',()=>{
  const page=read('../src/modules/notifications/NotificationsPage.tsx'),hooks=read('../src/api/notificationHooks.ts');
  assert.match(page,/useNotificationsQuery\(\{page,pageSize:25,scope,unreadOnly,referenceType\}/);
  assert.match(page,/availableScopes\.map/);
  assert.match(hooks,/list:notificationListKey/);
  assert.match(hooks,/Object\.entries\(filters\)/);
});

test('NOTIF-RBAC-02 sépare chaque combinaison portée, catégorie, statut et page dans le cache',()=>{
  const scopes=notificationScopesFor('GLOBAL'),categories=['',...notificationCategories.map(([value])=>value)],keys=new Set<string>();
  for(const scope of scopes)for(const referenceType of categories)for(const unreadOnly of[false,true])for(const page of[1,2])keys.add(JSON.stringify(notificationListKey('user-10',{page,pageSize:25,scope,referenceType,unreadOnly})));
  assert.equal(keys.size,scopes.length*categories.length*2*2);
});

test('NOTIF-RBAC-02 garde les mutations sur les seules notifications personnelles',()=>{
  const page=read('../src/modules/notifications/NotificationsPage.tsx');
  assert.match(page,/personal=scope==='mine'/);
  assert.match(page,/!personal\|\|n\.isRead\|\|!canUpdate/);
  assert.match(page,/personal&&canArchive/);
});
