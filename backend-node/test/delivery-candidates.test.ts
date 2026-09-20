import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {pool} from '../src/config/database.js';

const originalExecute=pool.execute.bind(pool);
const token=jwt.sign({sub:'100',email:'planner@test.local',agencyId:'1'},env.jwt.accessSecret,{expiresIn:'5m'});
const users=[
  {id:'101',name:'Coordinateur libre',agencyId:'2',active:true,roleActive:true,prepare:true,system:false},
  {id:'102',name:'Responsable livraison',agencyId:'2',active:true,roleActive:true,prepare:false,system:false},
  {id:'103',name:'Inactif',agencyId:'2',active:false,roleActive:true,prepare:true,system:false},
  {id:'104',name:'Rôle inactif',agencyId:'2',active:true,roleActive:false,prepare:true,system:false},
  {id:'105',name:'Autre agence',agencyId:'1',active:true,roleActive:true,prepare:true,system:false},
  {id:'106',name:'Super Admin système',agencyId:'2',active:true,roleActive:true,prepare:true,system:true},
  {id:'107',name:'Super Admin dynamique',agencyId:'2',active:true,roleActive:true,prepare:true,system:false},
];
let candidateSql='';
before(()=>{(pool as any).execute=async(sql:string,params:unknown[]=[])=>{
  if(sql.includes('SELECT id,agency_id FROM users WHERE id='))return [[{id:'100',agency_id:'1'}],[]];
  if(sql.includes('SELECT r.id,r.code,r.is_system'))return [[{id:'200',code:'PLANIFICATEUR_LIBRE',is_system:0}],[]];
  if(sql.includes('SELECT p.code,rp.scope'))return [[{code:'delivery.schedule',scope:'GLOBAL'}],[]];
  if(sql.includes('SELECT s.agency_id FROM sales s WHERE s.id='))return String(params[0])==='10'?[[{agency_id:'2'}],[]]:[[],[]];
  if(sql.includes('SELECT DISTINCT u.id,CONCAT_WS')){
    candidateSql=sql;
    return [users.filter(user=>user.agencyId===String(params[0])&&user.active&&user.roleActive&&user.prepare&&!user.system).map(user=>({id:user.id,display_name:user.name,agency_id:user.agencyId})),[]];
  }
  return [[],[]];
}});
after(()=>{(pool as any).execute=originalExecute});
const specialists=async()=>{const response=await request(createApp()).get('/api/deliveries/candidates/10/specialists').set('Authorization',`Bearer ${token}`);assert.equal(response.status,200,JSON.stringify(response.body));return response.body as {id:string;name:string;agencyId:string}[]};

test('DEL-CAND-01/08 : rôle dynamique quelconque et permission effective donnent accès',async()=>{
  const ids=(await specialists()).map(user=>user.id);
  assert.ok(ids.includes('101'));
  assert.match(candidateSql,/u\.agency_id=\?/);
  assert.match(candidateSql,/u\.is_active=TRUE AND r\.is_active=TRUE/);
  assert.match(candidateSql,/p\.code='delivery\.prepare' AND p\.is_active=TRUE/);
  assert.match(candidateSql,/system_role\.code='SUPER_ADMIN' AND system_role\.is_system=TRUE/);
  assert.doesNotMatch(candidateSql,/role\.name|r\.code='DELIVERY_MANAGER'/);
});
test('DEL-CAND-02/07 : nom métier sans permission ne donne pas accès',async()=>assert.ok(!(await specialists()).some(user=>user.id==='102')));
test('DEL-CAND-03 : utilisateur inactif exclu',async()=>assert.ok(!(await specialists()).some(user=>user.id==='103')));
test('DEL-CAND-04 : rôle inactif exclu',async()=>assert.ok(!(await specialists()).some(user=>user.id==='104')));
test('DEL-CAND-05 : autre agence exclue',async()=>assert.ok(!(await specialists()).some(user=>user.id==='105')));
test('DEL-CAND-06 : vrai Super Admin système exclu, homonyme dynamique conservé',async()=>{const ids=(await specialists()).map(user=>user.id);assert.ok(!ids.includes('106'));assert.ok(ids.includes('107'))});
test('une vente hors du périmètre ne divulgue aucun candidat',async()=>{const response=await request(createApp()).get('/api/deliveries/candidates/11/specialists').set('Authorization',`Bearer ${token}`);assert.equal(response.status,404)});
