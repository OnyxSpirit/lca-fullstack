import assert from'node:assert/strict';
import test from'node:test';
import{notificationVisibility}from'../src/modules/notifications/notification.routes';

const request=(granted?:'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL',system=false)=>({user:{sub:'10',agencyId:'20'},rbac:{isSuperAdmin:system,roleCode:'SUPER_ADMIN',permissions:new Map(granted?[['notifications.view',granted]]:[])}} as any);

test('NOTIF-RBAC-02 autorise la hiérarchie de notifications.view sans dépendre du nom du rôle',()=>{
  assert.equal(notificationVisibility(request('OWN'),'mine').scope,'mine');
  assert.equal(notificationVisibility(request('AGENCY'),'agency').scope,'agency');
  assert.equal(notificationVisibility(request('CONCESSION'),'concession').scope,'concession');
  assert.equal(notificationVisibility(request('GLOBAL'),'global').scope,'global');
  assert.equal(notificationVisibility(request('GLOBAL'), 'global').sql,'1=1');
});

test('NOTIF-RBAC-02 refuse les portées forgées et une absence de permission',()=>{
  assert.throws(()=>notificationVisibility(request('OWN'),'agency'),(error:any)=>error.status===403);
  assert.throws(()=>notificationVisibility(request('AGENCY'),'concession'),(error:any)=>error.status===403);
  assert.throws(()=>notificationVisibility(request('CONCESSION'),'global'),(error:any)=>error.status===403);
  assert.throws(()=>notificationVisibility(request(),'mine'),(error:any)=>error.status===403);
});

test('NOTIF-RBAC-02 borne agence et concession au contexte authentifié',()=>{
  assert.deepEqual(notificationVisibility(request('AGENCY'),'agency').params,['20']);
  assert.match(notificationVisibility(request('CONCESSION'),'concession').sql,/recipient_agency\.concession_id/);
  assert.deepEqual(notificationVisibility(request('CONCESSION'),'concession').params,['20']);
});
