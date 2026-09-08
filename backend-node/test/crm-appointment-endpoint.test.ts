import assert from 'node:assert/strict';
import {after,before,beforeEach,test} from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {pool} from '../src/config/database.js';

const originalExecute=pool.execute.bind(pool),originalGetConnection=pool.getConnection.bind(pool);
let stage='qualified';
let writes:{sql:string;params:unknown[]}[]=[];
const token=jwt.sign({sub:'100',email:'agent@test.local',roles:['SALES_AGENT'],agencyId:'1'},env.jwt.accessSecret,{expiresIn:'5m'});
const lead=()=>({lead_id:'10',opportunity_id:'20',customer_id:null,first_name:'Awa',last_name:'Test',company_name:null,email:'awa@test.local',phone:'+242060000001',source:'Web',lead_status:stage==='qualified'?'qualified':'new',priority:'medium',assigned_user_id:'100',created_by:'100',title:'SUV',stage,expected_value:15000000,probability:60,expected_close_date:null,lost_reason:null,notes:null,assigned_user_name:'Agent Test',created_by_name:'Agent Test',agency_id:'1',agency_name:'Agence Test',created_at:'2026-09-08',updated_at:'2026-09-08'});

before(()=>{
  (pool as any).execute=async(sql:string)=>sql.includes('FROM leads l JOIN opportunities o')?[[lead()],[]]:[[],[]];
  (pool as any).getConnection=async()=>({
    beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},
    execute:async(sql:string,params:unknown[]=[])=>{writes.push({sql,params});return sql.includes('INSERT INTO activities')?[{insertId:501,affectedRows:1},[]]:[{affectedRows:1},[]]},
  });
});
after(()=>{(pool as any).execute=originalExecute;(pool as any).getConnection=originalGetConnection});
beforeEach(()=>{stage='qualified';writes=[]});

test('qualified crée le vrai rendez-vous, son activité et passe l’opportunité à appointment',async()=>{
  const scheduledAt=new Date(Date.now()+86_400_000).toISOString();
  const response=await request(createApp()).post('/api/leads/10/appointments').set('Authorization',`Bearer ${token}`).send({scheduledAt,subject:'Présentation SUV',description:'Essai à préparer'});
  assert.equal(response.status,201);
  assert.equal(response.body.stage,'appointment');
  assert.equal(response.body.id,'501');
  assert.ok(writes.some(({sql})=>sql.includes('INSERT INTO activities')));
  assert.ok(writes.some(({sql})=>sql.includes('INSERT INTO follow_ups')));
  assert.ok(writes.some(({sql,params})=>sql.includes("UPDATE opportunities SET stage='appointment'")&&params[0]==='20'));
});

test('qualified ne peut toujours pas passer manuellement à test_drive',async()=>{
  const response=await request(createApp()).patch('/api/leads/10/stage').set('Authorization',`Bearer ${token}`).send({stage:'test_drive'});
  assert.equal(response.status,409);
  assert.match(response.body.message,/action métier/);
  assert.equal(writes.length,0);
});

test('new ne peut pas créer arbitrairement un rendez-vous',async()=>{
  stage='new';
  const response=await request(createApp()).post('/api/leads/10/appointments').set('Authorization',`Bearer ${token}`).send({scheduledAt:new Date(Date.now()+86_400_000).toISOString()});
  assert.equal(response.status,409);
  assert.match(response.body.message,/doit être qualifié/);
  assert.equal(writes.length,0);
});
