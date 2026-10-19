import assert from 'node:assert/strict';
import {after,before,beforeEach,test} from 'node:test';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {pool} from '../src/config/database.js';
import {issueTestAccessToken} from './helpers/auth-session-fixture.js';

const originalExecute=pool.execute.bind(pool),originalGetConnection=pool.getConnection.bind(pool);
const token=()=>issueTestAccessToken({userId:'100',email:'agent@test.local',roles:['CRM_APPOINTMENT_TEST'],agencyId:'1'});
const lead={lead_id:'10',opportunity_id:'20',customer_id:null,first_name:'Awa',last_name:'Test',company_name:null,email:'awa@test.local',phone:'+242060000001',source:'Web',lead_status:'qualified',priority:'medium',assigned_user_id:'100',created_by:'100',title:'SUV',stage:'appointment',expected_value:15000000,probability:60,expected_close_date:null,lost_reason:null,notes:null,assigned_user_name:'Agent Test',created_by_name:'Agent Test',agency_id:'1',agency_name:'Agence Test',created_at:'2026-09-08',updated_at:'2026-09-08'};
let duplicate=false,targetStatus='pending',lockedStage='appointment',writes:{sql:string;params:unknown[]}[]=[];

before(()=>{
  (pool as any).execute=async(sql:string)=>{
    if(sql.includes('FROM leads l JOIN opportunities o'))return[[lead],[]];
    if(sql.includes("SELECT id,TRIM(CONCAT(first_name,' ',last_name)) display_name FROM users"))return[[{id:'100',display_name:'Agent Test'}],[]];
    if(sql.includes('SELECT id,name FROM agencies WHERE id=?'))return[[{id:'1',name:'Agence Test'}],[]];
    if(sql.includes('FROM agencies a JOIN concessions c'))return[[{agency_id:'1',concession_id:'1',currency_code:'XAF',timezone:'Africa/Brazzaville'}],[]];
    if(sql.includes('SELECT r.id,r.code,r.is_system'))return[[{id:'role-test',code:'CRM_APPOINTMENT_TEST',is_system:0}],[]];
    if(sql.includes('SELECT p.code,rp.scope'))return[[{code:'crm.appointment.create',scope:'OWN'},{code:'crm.prospect.update',scope:'OWN'}],[]];
    return[[],[]];
  };
  (pool as any).getConnection=async()=>({
    beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},
    execute:async(sql:string,params:unknown[]=[])=>{
      writes.push({sql,params});
      if(sql.includes('SELECT stage FROM opportunities'))return[[{stage:lockedStage}],[]];
      if(sql.includes("f.id=? AND f.lead_id=?")&&sql.includes("act.type='appointment'"))return[[{id:'7',activity_id:'501',assigned_user_id:'100',status:targetStatus}],[]];
      if(sql.includes("f.status='pending' AND f.scheduled_at=?"))return[duplicate?[{id:'8'}]:[],[]];
      if(sql.includes('FROM showroom_test_drives'))return[[],[]];
      if(sql.includes("FROM follow_ups f WHERE")&&sql.includes("f.status='pending'"))return[[],[]];
      if(sql.includes('INSERT INTO activities'))return[{insertId:501,affectedRows:1},[]];
      return[{affectedRows:1},[]];
    },
  });
});
after(()=>{(pool as any).execute=originalExecute;(pool as any).getConnection=originalGetConnection});
beforeEach(()=>{duplicate=false;targetStatus='pending';lockedStage='appointment';writes=[]});

test('B341 création : un doublon actif exact retourne 409 avant toute écriture',async()=>{
  duplicate=true;
  const response=await request(createApp()).post('/api/leads/10/appointments').set('Authorization',`Bearer ${token()}`).send({scheduledAt:'2099-10-22T09:00:00.000Z',durationMinutes:30});
  assert.equal(response.status,409);assert.match(response.body.message,/rendez-vous actif existe déjà/);assert.equal(response.body.details.code,'CRM_APPOINTMENT_DUPLICATE');
  assert.equal(writes.some(item=>item.sql.includes('INSERT INTO activities')||item.sql.includes('INSERT INTO follow_ups')),false);
  const lock=writes.findIndex(item=>item.sql.includes('SELECT stage FROM opportunities')&&item.sql.includes('FOR UPDATE')),check=writes.findIndex(item=>item.sql.includes("f.status='pending' AND f.scheduled_at=?"));assert.ok(lock>=0&&check>lock);
});

test('B341 création : même dossier sur un autre créneau reste autorisé',async()=>{
  const response=await request(createApp()).post('/api/leads/10/appointments').set('Authorization',`Bearer ${token()}`).send({scheduledAt:'2099-10-22T10:00:00.000Z',durationMinutes:30});
  assert.equal(response.status,201);assert.ok(writes.some(item=>item.sql.includes('INSERT INTO follow_ups')));
});

test('B341 report : met à jour les mêmes lignes et exclut le rendez-vous lui-même',async()=>{
  const response=await request(createApp()).patch('/api/leads/10/appointments/7').set('Authorization',`Bearer ${token()}`).send({scheduledAt:'2099-10-23T10:00:00.000Z',durationMinutes:45,subject:'Présentation'});
  assert.equal(response.status,200);assert.equal(response.body.id,'7');assert.equal(response.body.durationMinutes,45);
  assert.ok(writes.some(item=>item.sql.startsWith('UPDATE follow_ups SET scheduled_at=')));
  assert.ok(writes.some(item=>item.sql.startsWith('UPDATE activities SET subject=')));
  assert.equal(writes.some(item=>item.sql.includes('INSERT INTO activities')||item.sql.includes('INSERT INTO follow_ups')),false);
  assert.ok(writes.some(item=>item.sql.includes('f.id<>?')&&item.sql.includes("f.scheduled_at=?")));
});

test('B341 report : une collision avec un autre rendez-vous est refusée sans modification',async()=>{
  duplicate=true;
  const response=await request(createApp()).patch('/api/leads/10/appointments/7').set('Authorization',`Bearer ${token()}`).send({scheduledAt:'2099-10-23T10:00:00.000Z',durationMinutes:30});
  assert.equal(response.status,409);assert.equal(writes.some(item=>item.sql.startsWith('UPDATE follow_ups SET scheduled_at=')),false);
});

test('B341 annulation : conserve les lignes et les rend terminales avec le motif',async()=>{
  const response=await request(createApp()).post('/api/leads/10/appointments/7/cancel').set('Authorization',`Bearer ${token()}`).send({reason:'Client indisponible'});
  assert.equal(response.status,200);assert.equal(response.body.status,'cancelled');
  assert.ok(writes.some(item=>item.sql.includes("UPDATE follow_ups SET status='cancelled'")));
  assert.ok(writes.some(item=>item.sql.includes("UPDATE activities SET status='cancelled'")));
  assert.equal(writes.some(item=>/DELETE FROM (follow_ups|activities)/.test(item.sql)),false);
});

test('B341 modification/annulation : un rendez-vous terminal ne peut pas être réécrit',async()=>{
  targetStatus='cancelled';
  const update=await request(createApp()).patch('/api/leads/10/appointments/7').set('Authorization',`Bearer ${token()}`).send({scheduledAt:'2099-10-23T10:00:00.000Z',durationMinutes:30});
  const cancel=await request(createApp()).post('/api/leads/10/appointments/7/cancel').set('Authorization',`Bearer ${token()}`).send({reason:'Bis'});
  assert.equal(update.status,409);assert.equal(cancel.status,409);
});

test('B3461 report/annulation : une étape postérieure est refusée sous verrou sans écriture',async()=>{
  lockedStage='test_drive';
  const update=await request(createApp()).patch('/api/leads/10/appointments/7').set('Authorization',`Bearer ${token()}`).send({scheduledAt:'2099-10-23T10:00:00.000Z',durationMinutes:30});
  const cancel=await request(createApp()).post('/api/leads/10/appointments/7/cancel').set('Authorization',`Bearer ${token()}`).send({reason:'Trop tard'});
  assert.equal(update.status,409);assert.equal(update.body.details.code,'CRM_APPOINTMENT_STAGE_CONFLICT');
  assert.equal(cancel.status,409);assert.equal(cancel.body.details.code,'CRM_APPOINTMENT_STAGE_CONFLICT');
  assert.equal(writes.some(item=>item.sql.startsWith('UPDATE follow_ups')||item.sql.startsWith('UPDATE activities')),false);
});
