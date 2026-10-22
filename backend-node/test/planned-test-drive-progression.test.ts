import assert from'node:assert/strict';
import test from'node:test';
import type{PoolConnection}from'mysql2/promise';
import{startPlannedTestDrive}from'../src/modules/showroom/showroom-test-drive.ts';

type Call={sql:string;params:unknown[]};
const planned={id:42,status:'planned',scheduled_at:'2026-10-23 09:00:00',duration_minutes:30,vehicle_id:7,advisor_id:8,agency_id:9,visit_id:10,lead_id:11,opportunity_id:12,visitor_name:'Prospect Test'};

function connectionFor(row:Record<string,unknown>,opportunityAffected=1){
  const calls:Call[]=[];
  const connection={execute:async(sql:string,params:unknown[]=[])=>{
    calls.push({sql,params});
    if(sql.includes('FROM showroom_test_drives td'))return[[row],[]];
    if(sql.includes('FROM vehicles WHERE'))return[[{id:7,mileage:100,status:'available',agency_id:9,is_commercial_stock:1,archived_at:null}],[]];
    if(sql.includes('FROM users WHERE'))return[[{id:8}],[]];
    if(sql.includes('FROM showroom_visits WHERE'))return[[{id:10}],[]];
    if(sql.startsWith('UPDATE opportunities'))return[{affectedRows:opportunityAffected},[]];
    if(sql.startsWith('UPDATE showroom_test_drives'))return[{affectedRows:1},[]];
    return[[],[]];
  }} as unknown as PoolConnection;
  return{connection,calls};
}

test('un essai planifié démarre et fait passer atomiquement le CRM à test_drive',async()=>{
  const{connection,calls}=connectionFor(planned);
  const result=await startPlannedTestDrive(connection,'42',new Date('2026-10-23T09:00:30.000Z'));
  assert.deepEqual(result,{agencyId:'9',visitId:'10',visitorName:'Prospect Test',leadId:'11',opportunityId:'12'});
  const crm=calls.findIndex(call=>call.sql.startsWith('UPDATE opportunities'));
  const drive=calls.findIndex(call=>call.sql.startsWith('UPDATE showroom_test_drives'));
  assert.ok(crm>=0&&drive>crm,'la transition CRM doit précéder la validation finale de l’essai dans la transaction');
  assert.match(calls[crm]!.sql,/stage='test_drive'.+stage='appointment'/);
  assert.match(calls[drive]!.sql,/status='in_progress'.+status='planned'/);
});

test('un essai peut démarrer avant son horaire planifié',async()=>{
  const{connection,calls}=connectionFor({...planned,scheduled_at:'2026-10-23 10:00:00'});
  await startPlannedTestDrive(connection,'42');
  assert.equal(calls.some(call=>call.sql.startsWith('UPDATE showroom_test_drives')),true);
});

test('un essai planifié la veille peut démarrer tardivement',async()=>{
  const{connection,calls}=connectionFor({...planned,scheduled_at:'2026-10-22 09:00:00'});
  await startPlannedTestDrive(connection,'42');
  assert.equal(calls.some(call=>call.sql.startsWith('UPDATE showroom_test_drives')),true);
});

test('un double démarrage est refusé sans aucune écriture',async()=>{
  const{connection,calls}=connectionFor({...planned,status:'in_progress'});
  await assert.rejects(()=>startPlannedTestDrive(connection,'42'),/non planifié/);
  assert.equal(calls.some(call=>call.sql.startsWith('UPDATE ')),false);
});

test('une transition CRM concurrente échouée empêche la mise à jour de l’essai',async()=>{
  const{connection,calls}=connectionFor(planned,0);
  await assert.rejects(()=>startPlannedTestDrive(connection,'42'),/rendez-vous CRM n’est plus valide/);
  assert.equal(calls.some(call=>call.sql.startsWith('UPDATE showroom_test_drives')),false);
});
