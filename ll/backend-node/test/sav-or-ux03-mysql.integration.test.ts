import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';
import{after,test}from'node:test';
import supertest from'supertest';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import{createApp}from'../src/app.js';
import{pool,query}from'../src/config/database.js';

const enabled=process.env.LCA_SAV_OR_UX03_DB_TEST==='1';
if(enabled)after(async()=>pool.end());
const rows=(sql:string,params:unknown[]=[])=>query<RowDataPacket[]>(sql,params);
const insert=async(sql:string,params:unknown[]=[])=>String((await pool.execute<ResultSetHeader>(sql,params))[0].insertId);

test('SAV-OR-UX-03 persiste et isole les actions one-shot par OR',{skip:!enabled},async()=>{
  const api=supertest(createApp()),suffix=randomUUID().slice(0,8);
  const login=await api.post('/api/auth/login').send({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});assert.equal(login.status,200,JSON.stringify(login.body));
  const auth=(request:supertest.Test)=>request.set('Authorization',`Bearer ${login.body.accessToken}`);
  const[admin]=await rows('SELECT id,agency_id FROM users WHERE email=?',[process.env.ADMIN_EMAIL]),agency=String(admin.agency_id);
  const brand=await insert('INSERT INTO brands(name,code)VALUES(?,?)',[`UX03 ${suffix}`,`UX03_${suffix}`]);
  const model=await insert('INSERT INTO models(brand_id,name)VALUES(?,?)',[brand,'M']);
  const version=await insert('INSERT INTO versions(model_id,name)VALUES(?,?)',[model,'V']);
  const customer=await insert('INSERT INTO customers(customer_code,agency_id,first_name,last_name)VALUES(?,?,?,?)',[`UX03C_${suffix}`,agency,'Client','Commun']);
  const vehicle=await insert('INSERT INTO vehicles(version_id,agency_id,vin)VALUES(?,?,?)',[version,agency,`UX03${suffix}VIN`]);
  const makeOrder=(label:string,status='planned')=>insert('INSERT INTO repair_orders(order_number,customer_id,vehicle_id,agency_id,advisor_id,mileage_in,status,created_by)VALUES(?,?,?,?,?,45000,?,?)',[`OR-UX03-${label}-${suffix}`,customer,vehicle,agency,admin.id,status,admin.id]);
  const first=await makeOrder('ONE'),second=await makeOrder('TWO');
  const inspection={fuelLevel:'50 %',cleanliness:'Propre',mileage:45000};
  assert.equal((await auth(api.post(`/api/repair-orders/${first}/inspection`)).send(inspection)).status,200);
  assert.equal((await auth(api.post(`/api/repair-orders/${first}/inspection`)).send(inspection)).status,409);
  const firstReload=await auth(api.get(`/api/repair-orders/${first}`));assert.ok(firstReload.body.inspection);
  const secondReload=await auth(api.get(`/api/repair-orders/${second}`));assert.equal(secondReload.body.inspection,null);
  assert.equal((await auth(api.post(`/api/repair-orders/${second}/inspection`)).send(inspection)).status,200);
  assert.equal((await auth(api.patch(`/api/repair-orders/${first}/status`)).send({status:'received'})).status,200);
  const diagnostic={diagnosis:'Diagnostic persistant',recommendations:'Réparer',estimatedHours:2.25};
  assert.equal((await auth(api.post(`/api/repair-orders/${first}/diagnostics`)).send(diagnostic)).status,201);
  assert.equal((await auth(api.post(`/api/repair-orders/${first}/diagnostics`)).send(diagnostic)).status,409);
  const diagnosticReload=await auth(api.get(`/api/repair-orders/${first}`));assert.equal(diagnosticReload.body.diagnostics.length,1);assert.equal(Number(diagnosticReload.body.diagnostics[0].estimated_hours),2.25);

  const qualityOrder=await makeOrder('QC','quality_control');
  await pool.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,'in_progress','quality_control','Entrée en contrôle qualité',?)",[qualityOrder,admin.id]);
  const failed={plannedWorkCompleted:false,defectCorrected:false,roadTestPerformed:false,noLeaks:false,levelsChecked:false,cleanlinessChecked:false,result:'failed',reason:'Reprise nécessaire'};
  assert.equal((await auth(api.post(`/api/repair-orders/${qualityOrder}/quality-control`)).send(failed)).status,201);
  assert.equal((await auth(api.post(`/api/repair-orders/${qualityOrder}/quality-control`)).send(failed)).status,409);
  assert.equal((await auth(api.patch(`/api/repair-orders/${qualityOrder}/status`)).send({status:'in_progress'})).status,200);
  assert.equal((await auth(api.patch(`/api/repair-orders/${qualityOrder}/status`)).send({status:'quality_control'})).status,200);
  const passed={plannedWorkCompleted:true,defectCorrected:true,roadTestPerformed:true,noLeaks:true,levelsChecked:true,cleanlinessChecked:true,result:'passed'};
  assert.equal((await auth(api.post(`/api/repair-orders/${qualityOrder}/quality-control`)).send(passed)).status,201);
  const[proof]=await rows('SELECT COUNT(*) total FROM repair_quality_controls WHERE repair_order_id=?',[qualityOrder]);assert.equal(Number(proof.total),2);
  console.log('SAV_OR_UX03_EVIDENCE',JSON.stringify({inspection:[200,409],otherOrderIndependent:true,diagnostic:[201,409],diagnosticHours:2.25,qualityCycle:[201,409,201],qualityRows:Number(proof.total)}));
});
