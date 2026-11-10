import assert from'node:assert/strict';
import test from'node:test';
import{notificationVisibility}from'../src/modules/notifications/notification.routes';

const request=(granted?:'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL')=>({user:{sub:'10',sid:'s',agencyId:'99'},agencyRbac:{userId:'10',sessionId:'s',activeAgencyId:'20',contextVersion:1,isSuperAdmin:false,agencies:[],roles:[],permissions:new Map(granted?[['notifications.view',granted]]:[])}} as any);

test('PH2C2B-NOTIF visibilité personnelle combine destinataire et agence active',async()=>{
 assert.deepEqual(await notificationVisibility(request('OWN'),'mine'),{scope:'mine',sql:'n.user_id=? AND (n.operation_agency_id IS NULL OR n.operation_agency_id=?)',params:['10','20']});
 assert.deepEqual(await notificationVisibility(request('AGENCY'),'agency'),{scope:'agency',sql:'n.operation_agency_id=?',params:['20']});
});

test('PH2C2B-NOTIF refuse portée forgée, scope historique et élévation OWN',async()=>{
 await assert.rejects(()=>notificationVisibility(request('OWN'),'agency'),(error:any)=>error.status===403);
 await assert.rejects(()=>notificationVisibility(request('CONCESSION'),'mine'),/OWN ou AGENCY/);
 await assert.rejects(()=>notificationVisibility(request('GLOBAL'),'global'),/OWN ou AGENCY/);
 await assert.rejects(()=>notificationVisibility(request(),'mine'),(error:any)=>error.status===403);
 await assert.rejects(()=>notificationVisibility(request('AGENCY'),'invalid'),(error:any)=>error.status===400);
});
