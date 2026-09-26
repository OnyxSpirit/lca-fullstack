import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { RbacTestSessionFixture, type TestPermission } from './support/rbac-test-session.js';

type Visit = {
  id:string; agency_id:string; assigned_user_id:string|null; greeted_by:string; status:string;
  visitor_name:string; phone:string|null; reason:string; preferred_model:null; vehicle_id:null;
  lead_id:null; customer_id:null; queue_number:number; arrival_at:string; assigned_at:null;
  completed_at:null; cancellation_reason:null; notes:null; outcome:null;
};
type Drive = { id:string; visit_id:string; agency_id:string; advisor_id:string; status:string; mileage_out:number; vehicle_id:string; lead_id:null; customer_id:null; visitor_name:string };

const A1='11',A2='12',B1='21',U1='101',CA1='111',CA2='112',CB1='121';
const resources=[
  {id:'101',agencyId:A1,ownerId:U1},
  {id:'102',agencyId:A2,ownerId:CA2},
  {id:'103',agencyId:B1,ownerId:CB1},
  {id:'104',agencyId:A1,ownerId:CA1},
] as const;
const assigneeByAgency:Record<string,string>={[A1]:CA1,[A2]:CA2,[B1]:CB1};
const vehicleByAgency:Record<string,string>={[A1]:'201',[A2]:'202',[B1]:'203'};
const driveByAgency:Record<string,string>={[A1]:'301',[A2]:'302',[B1]:'303'};
const leadByAgency:Record<string,string>={[A1]:'401',[A2]:'402',[B1]:'403'};
const agencyByLead:Record<string,string>={'401':A1,'402':A2,'403':B1};
const agencyByDrive:Record<string,string>={'301':A1,'302':A2,'303':B1};
const originalExecute=pool.execute.bind(pool);
const originalGetConnection=pool.getConnection.bind(pool);
const auth=new RbacTestSessionFixture();
const app=createApp();
let visits:Visit[]=[];
let drives:Drive[]=[];
let nextVisit=900;
let nextDrive=950;

function visitRow(resource:typeof resources[number],status='in_progress'):Visit{
  return {id:resource.id,agency_id:resource.agencyId,assigned_user_id:resource.ownerId,greeted_by:resource.ownerId,status,visitor_name:`Visiteur ${resource.id}`,phone:null,reason:'Recette',preferred_model:null,vehicle_id:null,lead_id:null,customer_id:null,queue_number:Number(resource.id),arrival_at:new Date().toISOString(),assigned_at:null,completed_at:null,cancellation_reason:null,notes:null,outcome:null};
}
function resetDomain(){
  visits=resources.map(resource=>visitRow(resource));
  drives=resources.slice(0,3).map(resource=>({id:driveByAgency[resource.agencyId],visit_id:resource.id,agency_id:resource.agencyId,advisor_id:resource.ownerId,status:'in_progress',mileage_out:100,vehicle_id:vehicleByAgency[resource.agencyId],lead_id:null,customer_id:null,visitor_name:`Visiteur ${resource.id}`}));
  nextVisit=900;nextDrive=950;
}
function decorated(visit:Visit){return {...visit,assigned_user_name:null,greeted_by_name:null,vehicle_label:null,wait_minutes:0,active_test_drive_id:null,active_test_drive_mileage:null}}
function concession(agency:string){return agency===B1?'C2':'C1'}
function visible(sql:string,params:unknown[],visit:Visit){
  const hasId=sql.includes('sv.id=?');
  if(hasId&&visit.id!==String(params[0]))return false;
  const offset=hasId?1:0;
  if(sql.includes('sv.agency_id=? AND (sv.assigned_user_id=?'))return visit.agency_id===String(params[offset])&&(visit.assigned_user_id===String(params[offset+1])||visit.assigned_user_id===null&&visit.greeted_by===String(params[offset+2]));
  if(sql.includes('sv.agency_id=?'))return visit.agency_id===String(params[offset]);
  if(sql.includes('scoped_agency.concession_id='))return concession(visit.agency_id)===concession(String(params[offset]));
  return true;
}
function roleRows(userId:string){
  const role=auth.roles.get(auth.userRoles.get(userId)??'');
  return role?[{id:role.id,code:role.code,is_system:0}]:[];
}
async function domainQuery(sql:string,params:unknown[]=[]):Promise<any>{
  if(sql.includes('JOIN refresh_tokens rt'))return auth.authRows(params);
  if(sql.includes('SELECT r.id,r.code,r.is_system FROM users u JOIN user_roles'))return roleRows(String(params[0]));
  if(sql.includes('SELECT p.code,rp.scope FROM role_permissions'))return auth.roles.get(String(params[0]))?.permissions??[];
  if(sql.includes('FROM agencies target')){const target=String(params[1]),actor=String(params[0]);return [{id:target,is_active:1,concession_id:concession(target),actor_concession_id:concession(actor)}]}
  if(sql.includes('FROM showroom_visits sv'))return visits.filter(visit=>visible(sql,params,visit)).map(decorated);
  if(sql.includes('FROM showroom_test_drives td')&&sql.includes('WHERE td.visit_id=?'))return drives.filter(drive=>drive.visit_id===String(params[0]));
  if(sql.includes('FROM showroom_test_drives td JOIN showroom_visits sv')){
    const drive=drives.find(item=>item.id===String(params[0]));
    const allowed=drive&&(
      sql.includes('scoped_agency.concession_id=')?concession(drive.agency_id)===concession(String(params[1])):
      sql.includes('td.agency_id=? AND td.advisor_id=?')?drive.agency_id===String(params[1])&&drive.advisor_id===String(params[2]):
      !sql.includes('td.agency_id=?')||drive.agency_id===String(params[1])
    );
    return allowed?[{...drive,opportunity_id:null}]:[];
  }
  if(sql.includes('EXISTS(SELECT 1 FROM user_roles')&&sql.includes('eligible FROM users u')){
    const id=String(params[0]),agency=id===U1?A1:id===CA1?A1:id===CA2?A2:id===CB1?B1:'';
    return agency?[{id,agency_id:agency,concession_id:concession(agency),is_active:1,eligible:1}]:[];
  }
  if(sql.includes('FROM users u JOIN user_roles')&&sql.includes("p.code IN ('sales.create','crm.prospect.update')")){
    const id=String(params[0]),agency=String(params[1]);return assigneeByAgency[agency]===id||id===U1&&agency===A1?[{id}]:[];
  }
  if(sql.includes('FROM vehicles WHERE id=? AND agency_id=?')){const id=String(params[0]),agency=String(params[1]);return vehicleByAgency[agency]===id?[{id,mileage:100,status:'available',agency_id:agency}]:[]}
  if(sql.includes('FROM leads l JOIN opportunities o')){
    const id=String(params[0]),agency=agencyByLead[id];
    return agency?[{id,customer_id:null,first_name:'Prospect',last_name:id,company_name:null,phone:null,opportunity_id:`5${id}`,stage:'appointment',assigned_user_id:assigneeByAgency[agency],agency_id:agency,title:'Essai'}]:[];
  }
  if(sql.includes('FROM opportunities o WHERE'))return [];
  if(sql==='SELECT concession_id FROM agencies WHERE id=?')return [{concession_id:concession(String(params[0]))}];
  if(sql.startsWith('UPDATE showroom_visits SET status=')){
    const id=String(params.at(-1)),visit=visits.find(item=>item.id===id);if(visit)visit.status=sql.includes("status='completed'")?'completed':'cancelled';return {affectedRows:visit?1:0};
  }
  if(sql.startsWith('UPDATE showroom_test_drives')){const drive=drives.find(item=>item.id===String(params.at(-1)));if(drive)drive.status=sql.includes("status='completed'")?'completed':'cancelled';return {affectedRows:drive?1:0}}
  return [];
}
async function connectionExecute(sql:string,params:unknown[]=[]):Promise<any>{
  if(sql.includes('SELECT assigned_user_id,status FROM showroom_visits')){const visit=visits.find(item=>item.id===String(params[0]));return visit?[visit]:[]}
  if(sql.startsWith('UPDATE showroom_visits SET assigned_user_id=')){const visit=visits.find(item=>item.id===String(params[1]));if(visit){visit.assigned_user_id=String(params[0]);visit.status='assigned'}return {affectedRows:visit?1:0}}
  if(sql.includes('SELECT COALESCE(MAX(queue_number)'))return [{next_number:1}];
  if(sql.startsWith('INSERT INTO showroom_visits')){
    const id=String(nextVisit++),isCrm=sql.includes("'in_progress'");
    const agency=String(params[isCrm?9:8]);
    visits.push({id,agency_id:agency,assigned_user_id:isCrm?String(params[7]):null,greeted_by:String(params[isCrm?8:7]),status:isCrm?'in_progress':'waiting',visitor_name:String(params[isCrm?2:2]),phone:null,reason:'Recette',preferred_model:null,vehicle_id:null,lead_id:null,customer_id:null,queue_number:1,arrival_at:new Date().toISOString(),assigned_at:null,completed_at:null,cancellation_reason:null,notes:null,outcome:null});
    return {insertId:Number(id),affectedRows:1};
  }
  if(sql.startsWith('INSERT INTO showroom_test_drives'))return {insertId:nextDrive++,affectedRows:1};
  if(sql.includes('FROM showroom_test_drives td JOIN showroom_visits sv'))return domainQuery(sql,params);
  if(sql.includes('FROM opportunities o')&&sql.includes('has_valid_appointment'))return [{id:`5${params[0]}`,stage:'appointment',has_valid_appointment:1}];
  if(sql.startsWith("UPDATE opportunities SET stage='test_drive'"))return {affectedRows:1};
  if(sql.startsWith('INSERT INTO leads'))return {insertId:nextVisit++,affectedRows:1};
  return domainQuery(sql,params);
}

before(()=>{
  for(const agency of [{id:A1,concessionId:'C1'},{id:A2,concessionId:'C1'},{id:B1,concessionId:'C2'}])auth.addAgency(agency);
  for(const resource of resources)auth.addResource(resource);
  (pool as any).execute=async(sql:string,params:unknown[]=[])=>[await domainQuery(sql,params),[]];
  (pool as any).getConnection=async()=>({beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(sql:string,params:unknown[]=[])=>[await connectionExecute(sql,params),[]]});
});
after(()=>{(pool as any).execute=originalExecute;(pool as any).getConnection=originalGetConnection});
beforeEach(resetDomain);

function bearer(permissions:TestPermission[]){
  return `Bearer ${auth.createRbacTestSession({user:{id:U1,agencyId:A1},roleCode:`ROLE_SHOWROOM_RUNTIME_${Date.now()}`,permissions}).accessToken}`;
}
const expectStatus=(actual:number,expected:number,label:string)=>assert.equal(actual,expected,`${label}: HTTP ${actual} au lieu de ${expected}`);

describe('RBAC-PERMISSION-RECETTE-02 — matrice runtime Showroom',()=>{
  for(const [scope,expectedIds] of [['OWN',['101']],['AGENCY',['101','104']],['CONCESSION',['101','102','104']],['GLOBAL',['101','102','103','104']]] as const){
    test(`showroom.view ${scope}: collection filtrée et détails R1/R2/R3`,async()=>{
      const token=bearer([{code:'showroom.view',scope}]);
      const list=await request(app).get('/api/showroom').set('Authorization',token);
      expectStatus(list.status,200,`${scope} liste`);assert.deepEqual(list.body.visits.map((v:{id:string})=>v.id),expectedIds);
      for(const resource of resources.slice(0,3)){
        const response=await request(app).get(`/api/showroom/${resource.id}`).set('Authorization',token);
        const allowed=scope==='GLOBAL'||scope==='CONCESSION'&&resource.agencyId!==B1||(scope==='AGENCY'||scope==='OWN')&&resource.agencyId===A1&&resource.ownerId===U1;
        expectStatus(response.status,allowed?200:404,`${scope} détail ${resource.id}`);
      }
    });
  }

  for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const)for(const agency of [A1,A2,B1]){
    test(`showroom.visitor.create ${scope} -> agence ${agency}`,async()=>{
      const response=await request(app).post('/api/showroom').set('Authorization',bearer([{code:'showroom.visitor.create',scope}])).send({visitorName:'Runtime',reason:'Recette',agencyId:agency});
      const allowed=scope==='GLOBAL'||scope==='CONCESSION'&&agency!==B1||(scope==='OWN'||scope==='AGENCY')&&agency===A1;
      expectStatus(response.status,allowed?201:403,`${scope} création ${agency}`);
    });
  }

  for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const)for(const resource of resources.slice(0,3)){
    test(`showroom.assign ${scope} -> R${resource.id} / commercial même agence`,async()=>{
      const visit=visits.find(v=>v.id===resource.id)!;visit.status='waiting';visit.assigned_user_id=null;visit.greeted_by=resource.ownerId;
      const response=await request(app).patch(`/api/showroom/${resource.id}/assign`).set('Authorization',bearer([{code:'showroom.assign',scope}])).send({assignedUserId:assigneeByAgency[resource.agencyId],expectedAssignedUserId:null});
      const allowed=scope==='GLOBAL'||scope==='CONCESSION'&&resource.agencyId!==B1||scope==='AGENCY'&&resource.agencyId===A1||scope==='OWN'&&resource.agencyId===A1&&resource.ownerId===U1;
      expectStatus(response.status,allowed?200:404,`${scope} affectation ${resource.id}`);
    });
  }
  test('showroom.assign GLOBAL conserve la contrainte métier agence visite/commercial',async()=>{
    const visit=visits[0];visit.status='waiting';visit.assigned_user_id=null;
    const response=await request(app).patch('/api/showroom/101/assign').set('Authorization',bearer([{code:'showroom.assign',scope:'GLOBAL'}])).send({assignedUserId:CA2,expectedAssignedUserId:null});
    expectStatus(response.status,400,'affectation commerciale inter-agence');
  });

  for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const)for(const resource of resources.slice(0,3)){
    test(`showroom.status.update ${scope} -> annuler R${resource.id}`,async()=>{
      const response=await request(app).patch(`/api/showroom/${resource.id}/cancel`).set('Authorization',bearer([{code:'showroom.status.update',scope}])).send({reason:'Recette'});
      const allowed=scope==='GLOBAL'||scope==='CONCESSION'&&resource.agencyId!==B1||scope==='AGENCY'&&resource.agencyId===A1||scope==='OWN'&&resource.agencyId===A1&&resource.ownerId===U1;
      expectStatus(response.status,allowed?200:404,`${scope} statut ${resource.id}`);
    });
  }

  for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const)for(const resource of resources.slice(0,3)){
    test(`showroom.visitor.update ${scope} -> conversion ordinaire R${resource.id}`,async()=>{
      const response=await request(app).post(`/api/showroom/${resource.id}/convert-to-lead`).set('Authorization',bearer([{code:'showroom.visitor.update',scope},{code:'crm.prospect.assign',scope}])).send({title:'Projet'});
      const allowed=scope==='GLOBAL'||scope==='CONCESSION'&&resource.agencyId!==B1||scope==='AGENCY'&&resource.agencyId===A1||scope==='OWN'&&resource.agencyId===A1&&resource.ownerId===U1;
      expectStatus(response.status,allowed?201:404,`${scope} modification ${resource.id}`);
    });
  }

  test('OWN distingue une ressource possédée d’une ressource seulement située dans A1',async()=>{
    for(const code of ['showroom.view','showroom.assign','showroom.status.update','showroom.visitor.update']){
      const token=bearer([{code,scope:'OWN'},...(code==='showroom.visitor.update'?[{code:'crm.prospect.assign',scope:'OWN' as const}]:[])]);
      if(code==='showroom.assign'){const ownVisit=visits.find(v=>v.id==='101')!;ownVisit.status='waiting'}
      const own=code==='showroom.view'?await request(app).get('/api/showroom/101').set('Authorization',token):code==='showroom.assign'?await request(app).patch('/api/showroom/101/assign').set('Authorization',token).send({assignedUserId:CA1,expectedAssignedUserId:U1}):code==='showroom.status.update'?await request(app).patch('/api/showroom/101/cancel').set('Authorization',token).send({reason:'Recette'}):await request(app).post('/api/showroom/101/convert-to-lead').set('Authorization',token).send({title:'Projet'});
      resetDomain();if(code==='showroom.assign'){const otherVisit=visits.find(v=>v.id==='104')!;otherVisit.status='waiting'}
      const other=code==='showroom.view'?await request(app).get('/api/showroom/104').set('Authorization',token):code==='showroom.assign'?await request(app).patch('/api/showroom/104/assign').set('Authorization',token).send({assignedUserId:CA1,expectedAssignedUserId:CA1}):code==='showroom.status.update'?await request(app).patch('/api/showroom/104/cancel').set('Authorization',token).send({reason:'Recette'}):await request(app).post('/api/showroom/104/convert-to-lead').set('Authorization',token).send({title:'Projet'});
      expectStatus(own.status,code==='showroom.assign'?200:code==='showroom.view'?200:code==='showroom.status.update'?200:201,`${code} OWN R_OWN`);expectStatus(other.status,404,`${code} OWN R_NOT_OWN`);resetDomain();
    }
  });

  for(const operation of ['start','complete','cancel'] as const)for(const scope of ['AGENCY','CONCESSION','GLOBAL'] as const)for(const resource of resources.slice(0,3)){
    test(`essai ${operation} ${scope} -> ${resource.agencyId}`,async()=>{
      const token=bearer([{code:operation==='complete'?'showroom.status.update':'showroom.visitor.update',scope}]);
      const response=operation==='start'
        ?await request(app).post(`/api/showroom/${resource.id}/test-drives`).set('Authorization',token).send({vehicleId:vehicleByAgency[resource.agencyId],licenseNumber:'PERMIS',mileageOut:100})
        :operation==='complete'
          ?await request(app).patch(`/api/showroom/test-drives/${driveByAgency[resource.agencyId]}/complete`).set('Authorization',token).send({mileageIn:110})
          :await request(app).patch(`/api/showroom/test-drives/${driveByAgency[resource.agencyId]}/cancel`).set('Authorization',token).send({reason:'Recette'});
      const scopeAllows=scope==='GLOBAL'||scope==='CONCESSION'&&resource.agencyId!==B1||scope==='AGENCY'&&resource.agencyId===A1;
      const expected=operation==='start'&&scopeAllows&&resource.agencyId!==A1?400:scopeAllows?(operation==='start'?201:200):404;
      expectStatus(response.status,expected,`${operation} ${scope} ${resource.agencyId}`);
    });
  }

  for(const scope of ['AGENCY','CONCESSION','GLOBAL'] as const)for(const agency of [A1,A2,B1]){
    test(`démarrage CRM composite ${scope}/${scope} -> ${agency}`,async()=>{
      const permissions:TestPermission[]=[{code:'showroom.visitor.update',scope},{code:'crm.test_drive.create',scope}];
      const response=await request(app).post(`/api/showroom/crm/leads/${leadByAgency[agency]}/test-drives`).set('Authorization',bearer(permissions)).send({vehicleId:vehicleByAgency[agency],licenseNumber:'PERMIS',mileageOut:100});
      const allowed=scope==='GLOBAL'||scope==='CONCESSION'&&agency!==B1||scope==='AGENCY'&&agency===A1;
      expectStatus(response.status,allowed?201:403,`CRM ${scope} ${agency}`);
    });
  }
  test('démarrage CRM exige réellement la permission secondaire crm.test_drive.create',async()=>{
    const response=await request(app).post('/api/showroom/crm/leads/401/test-drives').set('Authorization',bearer([{code:'showroom.visitor.update',scope:'AGENCY'}])).send({vehicleId:'201',licenseNumber:'PERMIS',mileageOut:100});
    expectStatus(response.status,403,'permission composite absente');
  });
});
