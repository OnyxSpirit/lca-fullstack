import assert from 'node:assert/strict';
import {after,before,beforeEach,test} from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {pool} from '../src/config/database.js';

const originalExecute=pool.execute.bind(pool),originalGetConnection=pool.getConnection.bind(pool);
type Fixture={id:string;agencyId:string;active:boolean;roles:string[]};
let users:Record<string,Fixture>={},created:{assignedUserId:string|null;createdBy:string}|null=null,opportunityAssignedUserId:string|null=null,nextId=100;
const token=(role:string,id:string,agencyId:string|null='1')=>jwt.sign({sub:id,email:`${id}@test.local`,roles:[role],agencyId},env.jwt.accessSecret,{expiresIn:'5m'});
const payload={firstName:'Awa',lastName:'Test',phone:'+242 06 000 00 00',title:'SUV',source:'Passage Showroom'};
const leadRow=()=>({lead_id:String(nextId),opportunity_id:String(nextId+1),customer_id:null,first_name:'Awa',last_name:'Test',company_name:null,email:null,phone:payload.phone,source:payload.source,lead_status:'new',priority:'medium',assigned_user_id:created?.assignedUserId??null,created_by:created?.createdBy??null,title:'SUV',stage:'new',expected_value:null,probability:null,expected_close_date:null,lost_reason:null,notes:null,assigned_user_name:created?.assignedUserId?'Commercial Test':'',created_by_name:'Créateur Test',agency_id:'1',agency_name:'Agence A',created_at:'2026-09-08',updated_at:'2026-09-08'});

before(()=>{
  (pool as any).execute=async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('u.is_active,GROUP_CONCAT(r.code) roles')){const user=users[String(params[0])];return[user?[{id:user.id,agency_id:user.agencyId,is_active:user.active,roles:user.roles.join(',')}]:[],[]]}
    if(sql.includes('FROM leads l JOIN opportunities o'))return[created?[leadRow()]:[],[]];
    return[[],[]];
  };
  (pool as any).getConnection=async()=>({beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('INSERT INTO leads(')){created={assignedUserId:params[0]==null?null:String(params[0]),createdBy:String(params[1])};return[{insertId:nextId},[]]}
    if(sql.includes('INSERT INTO opportunities(')){opportunityAssignedUserId=params[1]==null?null:String(params[1]);return[{insertId:nextId+1},[]]}
    return[{affectedRows:1},[]];
  }});
});
after(()=>{(pool as any).execute=originalExecute;(pool as any).getConnection=originalGetConnection});
beforeEach(()=>{users={};created=null;opportunityAssignedUserId=null;nextId++});

test('RECEPTIONIST crée sans commercial et reste distinct du propriétaire',async()=>{
  users['10']={id:'10',agencyId:'1',active:true,roles:['RECEPTIONIST']};
  const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token('RECEPTIONIST','10')}`).send(payload);
  assert.equal(response.status,201);assert.equal(response.body.assignedUserId,null);assert.equal(opportunityAssignedUserId,null);assert.notEqual(response.body.assignedUserId,'10');assert.equal(response.body.createdById,'10');
});

test('RECEPTIONIST peut choisir un SALES_AGENT actif de la même agence',async()=>{
  users['20']={id:'20',agencyId:'1',active:true,roles:['SALES_AGENT']};
  const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token('RECEPTIONIST','10')}`).send({...payload,assignedUserId:'20'});
  assert.equal(response.status,201);assert.equal(response.body.assignedUserId,'20');assert.equal(opportunityAssignedUserId,'20');assert.equal(response.body.createdById,'10');
});

test('RECEPTIONIST peut choisir un SALES_MANAGER actif de la même agence',async()=>{
  users['21']={id:'21',agencyId:'1',active:true,roles:['SALES_MANAGER']};
  const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token('RECEPTIONIST','10')}`).send({...payload,assignedUserId:'21'});
  assert.equal(response.status,201);assert.equal(response.body.assignedUserId,'21');assert.equal(opportunityAssignedUserId,'21');
});

test('un utilisateur non commercial ne peut pas recevoir un prospect',async()=>{
  for(const role of ['RECEPTIONIST','TECHNICIAN','WAREHOUSE_CLERK']){users['30']={id:'30',agencyId:'1',active:true,roles:[role]};const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token('RECEPTIONIST','10')}`).send({...payload,assignedUserId:'30'});assert.equal(response.status,400);assert.match(response.body.message,/ne peut pas être affecté/)}
});

test('un commercial inactif est refusé',async()=>{users['20']={id:'20',agencyId:'1',active:false,roles:['SALES_AGENT']};const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token('RECEPTIONIST','10')}`).send({...payload,assignedUserId:'20'});assert.equal(response.status,400);assert.match(response.body.message,/inactif/)});
test('un commercial d’une autre agence est refusé',async()=>{users['20']={id:'20',agencyId:'2',active:true,roles:['SALES_AGENT']};const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token('RECEPTIONIST','10')}`).send({...payload,assignedUserId:'20'});assert.equal(response.status,403);assert.match(response.body.message,/n’appartient pas/)});

for(const role of ['SALES_AGENT','SALES_MANAGER'])test(`${role} devient propriétaire de son prospect sans choix explicite`,async()=>{users['20']={id:'20',agencyId:'1',active:true,roles:[role]};const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token(role,'20')}`).send(payload);assert.equal(response.status,201);assert.equal(response.body.assignedUserId,'20')});
for(const role of ['DIRECTOR','SUPER_ADMIN'])test(`${role} ne devient pas propriétaire par défaut`,async()=>{const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token(role,'40',null)}`).send(payload);assert.equal(response.status,201);assert.equal(response.body.assignedUserId,null)});

test('liste et détail supportent assigned_user_id NULL',async()=>{
  created={assignedUserId:null,createdBy:'10'};
  const authorization=`Bearer ${token('RECEPTIONIST','10')}`;
  const list=await request(createApp()).get('/api/leads').set('Authorization',authorization),detail=await request(createApp()).get(`/api/leads/${nextId}`).set('Authorization',authorization);
  assert.equal(list.status,200);assert.equal(list.body[0].assignedUserId,null);assert.equal(detail.status,200);assert.equal(detail.body.assignedUserId,null);
});
