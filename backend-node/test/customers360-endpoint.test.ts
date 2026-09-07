import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {pool} from '../src/config/database.js';

const originalExecute=pool.execute.bind(pool);
const accessToken=jwt.sign({sub:'10',email:'agent@lca.local',roles:['SALES_MANAGER'],agencyId:'1'},env.jwt.accessSecret,{expiresIn:'5m'});

const customer=(id:string,type:'individual'|'company')=>({
  id,customer_code:`CLI-${id.padStart(6,'0')}`,customer_type:type,civility:type==='company'?'Société':'Mme',
  first_name:type==='company'?null:'Aline',last_name:type==='company'?null:'Mabiala',company_name:type==='company'?'LCA Test SARL':null,
  email:'client@example.test',phone:'+242060000000',secondary_phone:null,address:null,postal_code:null,city:'Brazzaville',country:'Congo',
  tax_identifier:null,source:null,segment:null,score:0,classification:'occasional',notes:null,agency_id:'1',agency_name:'Agence test',
  assigned_user_id:'10',assigned_user_name:'Agent Test',created_by:'10',created_by_name:'Agent Test',total_revenue:0,open_balance:0,
  created_at:'2026-09-01 10:00:00',updated_at:'2026-09-01 10:00:00',
});

before(()=>{
  (pool as any).execute=async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('FROM customers c JOIN agencies a')){
      const id=String(params[0]??'');
      if(id==='1')return[[customer('1','individual')],[]];
      if(id==='3')return[[customer('3','company')],[]];
      return[[],[]];
    }
    return[[],[]];
  };
});

after(()=>{(pool as any).execute=originalExecute;});

test('GET /customers/:id/360 renvoie 200 et des collections vides pour un particulier neuf',async()=>{
  const response=await request(createApp()).get('/api/customers/1/360').set('Authorization',`Bearer ${accessToken}`);
  assert.equal(response.status,200);
  assert.equal(response.body.customer.customerType,'individual');
  for(const name of ['contacts','opportunities','vehicles','sales','repairOrders','invoices','timeline'])assert.deepEqual(response.body[name],[]);
});

test('GET /customers/:id/360 ouvre aussi une entreprise sans historique',async()=>{
  const response=await request(createApp()).get('/api/customers/3/360').set('Authorization',`Bearer ${accessToken}`);
  assert.equal(response.status,200);
  assert.equal(response.body.customer.customerType,'company');
  assert.equal(response.body.customer.companyName,'LCA Test SARL');
});

test('GET /customers/:id/360 renvoie 404 pour un client absent',async()=>{
  const response=await request(createApp()).get('/api/customers/404/360').set('Authorization',`Bearer ${accessToken}`);
  assert.equal(response.status,404);
  assert.equal(response.body.message,'Client introuvable');
});

test('GET /customers/:id/360 ne révèle pas un client hors agence',async()=>{
  const response=await request(createApp()).get('/api/customers/2/360').set('Authorization',`Bearer ${accessToken}`);
  assert.equal(response.status,404);
  assert.equal(response.body.message,'Client introuvable');
});
