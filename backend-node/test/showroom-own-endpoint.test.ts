import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { RbacTestSessionFixture } from './support/rbac-test-session.js';

type Visit = { id:string; agency_id:string; greeted_by:string; assigned_user_id:string|null; status:string; visitor_name:string; arrival_at:string; lead_id:null; customer_id:null; vehicle_id:null; queue_number:number };
const originalExecute=pool.execute.bind(pool);
const originalGetConnection=pool.getConnection.bind(pool);
const app=createApp();
const authFixture=new RbacTestSessionFixture();
const visits:Visit[]=[];
let nextId=1;
let driveWrites=0;
let permissions:Record<string,{code:string;scope:string}[]>={};
const token=(user:string,agency='1')=>authFixture.createRbacTestSession({user:{id:user,agencyId:agency},roleCode:'DYNAMIC_SHOWROOM'}).accessToken;
const own=[{code:'showroom.view',scope:'OWN'},{code:'showroom.visitor.create',scope:'OWN'},{code:'showroom.assign',scope:'OWN'},{code:'showroom.status.update',scope:'OWN'},{code:'showroom.visitor.update',scope:'OWN'}];
const call=(user:string,agency='1')=>({auth:`Bearer ${token(user,agency)}`});
const visible=(sql:string,params:unknown[],visit:Visit)=>{
  if(sql.includes('sv.id=?')&&visit.id!==String(params[0]))return false;
  if(sql.includes('sv.agency_id=? AND (sv.assigned_user_id=?')){
    const offset=sql.includes('sv.id=?')?1:0;
    return visit.agency_id===String(params[offset])&&(visit.assigned_user_id===String(params[offset+1])||visit.assigned_user_id===null&&visit.greeted_by===String(params[offset+2]));
  }
  if(sql.includes('sv.agency_id=?'))return visit.agency_id===String(params[sql.includes('sv.id=?')?1:0]);
  return true;
};

before(()=>{
  (pool as any).execute=async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('JOIN refresh_tokens rt'))return [authFixture.authRows(params),[]];
    if(sql.includes('SELECT r.id,r.code,r.is_system'))return [[{id:`role-${params[0]}`,code:'DYNAMIC_SHOWROOM',is_system:0}],[]];
    if(sql.includes('SELECT p.code,rp.scope'))return [permissions[String(params[0]).replace('role-','')]??[],[]];
    if(sql.includes('FROM agencies target'))return [[{id:params[1],is_active:1,concession_id:params[1],actor_concession_id:params[0]}],[]];
    if(sql.includes('FROM showroom_visits sv'))return [visits.filter(visit=>visible(sql,params,visit)).map(visit=>({...visit,assigned_user_name:null,greeted_by_name:null,wait_minutes:0,active_test_drive_id:null,active_test_drive_mileage:null})),[]];
    if(sql.includes('FROM showroom_test_drives td JOIN showroom_visits sv'))return [[{id:'9',visit_id:'1',agency_id:'1',advisor_id:'102',status:'in_progress',visitor_name:'Client Test'}],[]];
    if(sql.includes('FROM users u JOIN user_roles'))return [[{id:params[0]}],[]];
    if(sql.includes('FROM opportunities o WHERE'))return [[],[]];
    return [[],[]];
  };
  (pool as any).getConnection=async()=>({
    beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},
    execute:async(sql:string,params:unknown[]=[])=>{
      if(sql.includes('FROM showroom_test_drives td JOIN showroom_visits sv'))return [[{id:'9',visit_id:'1',agency_id:'1',advisor_id:'102',status:'in_progress',visitor_name:'Client Test',mileage_out:100,vehicle_id:'5',lead_id:null,customer_id:null}],[]];
      if(sql.startsWith('UPDATE showroom_test_drives'))driveWrites++;
      if(sql.includes('SELECT COALESCE(MAX(queue_number)'))return [[{next_number:nextId}],[]];
      if(sql.startsWith('INSERT INTO showroom_visits')){
        const id=String(nextId++);
        visits.push({id,customer_id:null,lead_id:null,visitor_name:String(params[2]),agency_id:String(params[8]),greeted_by:String(params[7]),assigned_user_id:null,status:'waiting',arrival_at:new Date().toISOString(),vehicle_id:null,queue_number:Number(params[9])});
        return [{insertId:Number(id),affectedRows:1},[]];
      }
      if(sql.includes('SELECT assigned_user_id,status FROM showroom_visits')){const visit=visits.find(row=>row.id===String(params[0]));return [visit?[visit]:[],[]]}
      if(sql.startsWith('UPDATE showroom_visits SET assigned_user_id=')){const visit=visits.find(row=>row.id===String(params[1]));if(visit){visit.assigned_user_id=String(params[0]);visit.status='assigned'}return [{affectedRows:visit?1:0},[]]}
      return [{affectedRows:1},[]];
    },
  });
});
after(()=>{(pool as any).execute=originalExecute;(pool as any).getConnection=originalGetConnection});
beforeEach(()=>{visits.length=0;nextId=1;driveWrites=0;permissions={'101':own,'102':own,'103':own,'201':[{code:'showroom.view',scope:'AGENCY'}],'203':[{code:'showroom.view',scope:'AGENCY'}],'202':[{code:'showroom.view',scope:'AGENCY'},{code:'showroom.status.update',scope:'OWN'}],'204':[{code:'showroom.view',scope:'OWN'},{code:'showroom.visitor.update',scope:'AGENCY'}]}});

test('SHOW-OWN-01/02/07 : POST puis GET indépendant conserve la visite chez A, sans la montrer à B',async()=>{
  const created=await request(app).post('/api/showroom').set('Authorization',call('101').auth).send({visitorName:'Client Test',reason:'Visite'});
  assert.equal(created.status,201,JSON.stringify(created.body));
  assert.equal(created.body.status,'waiting');
  assert.equal(created.body.assignedUserId,null);
  const a=await request(app).get('/api/showroom').set('Authorization',call('101').auth);
  const b=await request(app).get('/api/showroom').set('Authorization',call('102').auth);
  assert.equal(a.status,200);assert.deepEqual(a.body.visits.map((visit:{id:string})=>visit.id),[created.body.id]);
  assert.equal(b.status,200);assert.equal(b.body.visits.length,0);
});

test('SHOW-OWN-03/04 : l’affectation à A puis à B transfère la visibilité OWN',async()=>{
  const created=await request(app).post('/api/showroom').set('Authorization',call('101').auth).send({visitorName:'Client Test',reason:'Visite'});
  assert.equal(created.status,201);
  const id=created.body.id;
  assert.equal((await request(app).patch(`/api/showroom/${id}/assign`).set('Authorization',call('101').auth).send({assignedUserId:'101'})).status,200);
  assert.deepEqual((await request(app).get('/api/showroom').set('Authorization',call('101').auth)).body.visits.map((visit:{id:string})=>visit.id),[id]);
  assert.equal((await request(app).patch(`/api/showroom/${id}/assign`).set('Authorization',call('101').auth).send({assignedUserId:'102',expectedAssignedUserId:'101'})).status,200);
  for(const user of ['101','102','103']){
    const response=await request(app).get('/api/showroom').set('Authorization',call(user).auth);
    assert.equal(response.status,200);
    assert.deepEqual(response.body.visits.map((visit:{id:string})=>visit.id),user==='102'?[id]:[]);
  }
  const forbidden=await request(app).patch(`/api/showroom/${id}/complete`).set('Authorization',call('101').auth).send({outcome:'follow_up'});
  assert.equal(forbidden.status,404);
  assert.equal(visits[0].status,'assigned');
});

test('SHOW-OWN-05/06 : AGENCY garde les visites de son agence, OWN ne traverse pas une agence forgée',async()=>{
  const created=await request(app).post('/api/showroom').set('Authorization',call('101').auth).send({visitorName:'Client Test',reason:'Visite'});
  assert.equal(created.status,201);
  const id=created.body.id;
  assert.deepEqual((await request(app).get('/api/showroom').set('Authorization',call('201').auth)).body.visits.map((visit:{id:string})=>visit.id),[id]);
  assert.equal((await request(app).patch(`/api/showroom/${id}/assign`).set('Authorization',call('101').auth).send({assignedUserId:'102'})).status,200);
  const second=await request(app).post('/api/showroom').set('Authorization',call('102').auth).send({visitorName:'Autre client',reason:'Visite'});
  assert.equal(second.status,201);
  assert.deepEqual((await request(app).get('/api/showroom').set('Authorization',call('201').auth)).body.visits.map((visit:{id:string})=>visit.id),[id,second.body.id]);
  assert.equal((await request(app).get('/api/showroom').set('Authorization',call('203','2').auth)).body.visits.length,0);
  visits[0].agency_id='2';
  assert.equal((await request(app).get('/api/showroom').set('Authorization',call('101').auth)).body.visits.length,0);
  assert.deepEqual((await request(app).get('/api/showroom').set('Authorization',call('201').auth)).body.visits.map((visit:{id:string})=>visit.id),[second.body.id]);
});

test('le scope de mutation OWN reste indépendant de showroom.view AGENCY',async()=>{
  const created=await request(app).post('/api/showroom').set('Authorization',call('101').auth).send({visitorName:'Client Test',reason:'Visite'});
  assert.equal(created.status,201);
  const id=created.body.id;
  const visible=await request(app).get(`/api/showroom/${id}`).set('Authorization',call('202').auth);
  assert.equal(visible.status,200);
  const mutation=await request(app).patch(`/api/showroom/${id}/cancel`).set('Authorization',call('202').auth).send({reason:'Test'});
  assert.equal(mutation.status,404);
  assert.equal(visits[0].status,'waiting');
});

test('showroom.visitor.update AGENCY charge la visite même avec showroom.view OWN',async()=>{
  const created=await request(app).post('/api/showroom').set('Authorization',call('101').auth).send({visitorName:'Client Test',reason:'Visite'});
  assert.equal(created.status,201);
  const id=created.body.id;
  assert.equal((await request(app).get(`/api/showroom/${id}`).set('Authorization',call('204').auth)).status,404);
  const mutation=await request(app).post(`/api/showroom/${id}/test-drives`).set('Authorization',call('204').auth).send({vehicleId:'8'});
  assert.equal(mutation.status,409);
  assert.match(mutation.body.message,/doit être en cours/);
});

test('un conseiller OWN ne peut ni annuler ni terminer l’essai d’un autre',async()=>{
  const cancel=await request(app).patch('/api/showroom/test-drives/9/cancel').set('Authorization',call('101').auth).send({reason:'Test'});
  assert.equal(cancel.status,403);
  const complete=await request(app).patch('/api/showroom/test-drives/9/complete').set('Authorization',call('101').auth).send({mileageIn:120});
  assert.equal(complete.status,403);
  assert.equal(driveWrites,0);
});
