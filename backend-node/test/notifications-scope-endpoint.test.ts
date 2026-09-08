import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {pool} from '../src/config/database.js';

const originalExecute=pool.execute.bind(pool);
const token=jwt.sign({sub:'200',email:'manager@test.local',roles:['SALES_MANAGER'],agencyId:'1'},env.jwt.accessSecret,{expiresIn:'5m'});
before(()=>{(pool as any).execute=async(sql:string,params:unknown[]=[])=>{
  assert.equal(String(params[0]),'200');
  if(sql.includes('COUNT(*)')&&sql.includes('read_at IS NULL'))return[[{total:2}],[]];
  if(sql.includes('COUNT(*)'))return[[{total:2}],[]];
  return[[{id:'1',subject:'Prospect',message:'Affectation',delivery_status:'sent',event_type:'crm.lead_assigned',priority:'normal',read_at:null,reference_type:'lead',reference_id:'10',created_at:'2026-09-09'},{id:'2',subject:'Devis',message:'Validation',delivery_status:'sent',event_type:'quotation.created',priority:'normal',read_at:null,reference_type:'lead',reference_id:'10',created_at:'2026-09-09'}],[]];
}});
after(()=>{(pool as any).execute=originalExecute});

test('badge, compteur non lu et liste utilisent le même utilisateur accessible',async()=>{
  const response=await request(createApp()).get('/api/notifications?unreadOnly=true').set('Authorization',`Bearer ${token}`);
  assert.equal(response.status,200);
  assert.equal(response.body.unreadCount,2);
  assert.equal(response.body.total,2);
  assert.equal(response.body.items.length,2);
});
