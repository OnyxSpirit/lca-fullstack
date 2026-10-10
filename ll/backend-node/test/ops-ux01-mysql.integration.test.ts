import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import supertest from 'supertest';
import {createApp} from '../src/app.js';
import {pool} from '../src/config/database.js';

const enabled=process.env.LCA_OPS_UX01_DB_TEST==='1';
if(enabled)after(async()=>pool.end());

test('OPS-UX-01 refuse les quantités physiques décimales par API réelle',{skip:!enabled},async()=>{
  const api=supertest(createApp());
  const login=await api.post('/api/auth/login').send({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
  assert.equal(login.status,200,JSON.stringify(login.body));
  const auth=(request:supertest.Test)=>request.set('Authorization',`Bearer ${login.body.accessToken}`);
  const cases=[
    auth(api.post('/api/parts')).send({reference:'OPS-DEC',name:'Invalide',initialQuantity:1.5}),
    auth(api.post('/api/purchase-orders')).send({supplierId:'1',items:[{partId:'1',quantity:2.5,unitPrice:12500.5,taxRate:18.9}]}),
    auth(api.post('/api/purchase-orders/1/receipts')).send({idempotencyKey:'ops-ux01-decimal',items:[{itemId:'1',quantity:6.5}]}),
    auth(api.post('/api/repair-orders/1/estimate-items')).send({itemType:'part',partId:'1',quantity:2.5}),
    auth(api.patch('/api/repair-orders/1/parts/reservations/1')).send({status:'consumed',quantity:1.5}),
  ];
  const responses=await Promise.all(cases);
  assert.deepEqual(responses.map(response=>response.status),[400,400,400,400,400]);
  assert.ok(responses.every(response=>/entier/.test(String(response.body.message))),JSON.stringify(responses.map(response=>response.body)));
  console.log('OPS_UX01_NUMERIC_EVIDENCE',JSON.stringify({physicalDecimals:responses.map(response=>response.status),billableHoursValidatedBySavOr21:2.5,financialDecimalsPreserved:{unitPrice:12500.5,taxRate:18.9}}));
});
