import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {after,test} from 'node:test';
import supertest from 'supertest';
import type {ResultSetHeader,RowDataPacket} from 'mysql2/promise';
import {createApp} from '../src/app.js';
import {pool,query} from '../src/config/database.js';

const enabled=process.env.LCA_OPS_UX01_FINAL_DB_TEST==='1';
if(enabled)after(async()=>pool.end());
const rows=(sql:string,params:unknown[]=[])=>query<RowDataPacket[]>(sql,params);
const insert=async(sql:string,params:unknown[]=[])=>String((await pool.execute<ResultSetHeader>(sql,params))[0].insertId);

test('OPS-UX-01 final: kilométrage strict et conflit Planning concurrent',{skip:!enabled},async()=>{
  const api=supertest(createApp()),suffix=randomUUID().slice(0,8);
  const login=await api.post('/api/auth/login').send({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
  assert.equal(login.status,200,JSON.stringify(login.body));
  const auth=(request:supertest.Test)=>request.set('Authorization',`Bearer ${login.body.accessToken}`);
  const [admin]=await rows('SELECT id,agency_id,password_hash FROM users WHERE email=?',[process.env.ADMIN_EMAIL]),agency=String(admin.agency_id);
  const brand=await insert('INSERT INTO brands(name,code)VALUES(?,?)',[`OPS ${suffix}`,`OPS_${suffix}`]);
  const model=await insert('INSERT INTO models(brand_id,name)VALUES(?,?)',[brand,'M']);
  const version=await insert('INSERT INTO versions(model_id,name)VALUES(?,?)',[model,'V']);
  const customer=await insert('INSERT INTO customers(customer_code,agency_id,first_name,last_name)VALUES(?,?,?,?)',[`OPS_C_${suffix}`,agency,'Client','OPS']);
  const vehicle=await insert('INSERT INTO vehicles(version_id,agency_id,vin)VALUES(?,?,?)',[version,agency,`OPS${suffix}VIN`]);
  const mileageOrder=await insert('INSERT INTO repair_orders(order_number,customer_id,vehicle_id,agency_id,advisor_id,mileage_in,status,created_by)VALUES(?,?,?,?,?,0,\'planned\',?)',[`OR-OPS-KM-${suffix}`,customer,vehicle,agency,admin.id,admin.id]);
  const inspect=(mileage:unknown)=>auth(api.post(`/api/repair-orders/${mileageOrder}/inspection`)).send({fuelLevel:'50 %',cleanliness:'Propre',mileage});
  const accepted=await inspect(45000);assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  for(const invalid of [45000.5,-1,'NaN','Infinity']){const response=await inspect(invalid);assert.equal(response.status,400,`${String(invalid)}: ${JSON.stringify(response.body)}`)}
  const [persisted]=await rows('SELECT mileage FROM vehicle_reception_inspections WHERE repair_order_id=?',[mileageOrder]);assert.equal(Number(persisted.mileage),45000);

  const role=await insert('INSERT INTO roles(code,name,is_active,is_system)VALUES(?,?,TRUE,FALSE)',[`OPS_TECH_${suffix}`,`OPS Tech ${suffix}`]);
  const [permission]=await rows("SELECT id FROM permissions WHERE code='workshop.session.track'");await pool.execute('INSERT INTO role_permissions(role_id,permission_id,scope)VALUES(?,?,\'AGENCY\')',[role,permission.id]);
  const user=await insert('INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,?,?,?,?,TRUE)',[agency,'Tech','OPS',`tech-${suffix}@test.local`,admin.password_hash]);await pool.execute('INSERT INTO user_roles(user_id,role_id)VALUES(?,?)',[user,role]);
  const technician=await insert('INSERT INTO technicians(user_id,agency_id,is_active)VALUES(?,?,TRUE)',[user,agency]);
  const bay=await insert("INSERT INTO workshop_bays(agency_id,name,capacity,status)VALUES(?,?,1,'available')",[agency,`Pont OPS ${suffix}`]);
  const seedOrder=await insert('INSERT INTO repair_orders(order_number,customer_id,vehicle_id,agency_id,advisor_id,status,created_by)VALUES(?,?,?,?,?,\'in_progress\',?)',[`OR-OPS-1-${suffix}`,customer,vehicle,agency,admin.id,admin.id]);
  const secondOrder=await insert('INSERT INTO repair_orders(order_number,customer_id,vehicle_id,agency_id,advisor_id,status,created_by)VALUES(?,?,?,?,?,\'in_progress\',?)',[`OR-OPS-2-${suffix}`,customer,vehicle,agency,admin.id,admin.id]);
  const slot={technicianId:technician,bayId:bay,startsAt:'2026-09-21 10:00:00',endsAt:'2026-09-21 11:00:00'};
  const concurrent=await Promise.all([auth(api.post(`/api/repair-orders/${seedOrder}/assign`)).send(slot),auth(api.post(`/api/repair-orders/${secondOrder}/assign`)).send(slot)]);
  assert.deepEqual(concurrent.map(response=>response.status).sort(),[201,409]);
  const [count]=await rows("SELECT COUNT(*) total FROM schedules WHERE bay_id=? AND status<>'cancelled' AND starts_at<? AND ends_at>?",[bay,slot.endsAt,slot.startsAt]);assert.equal(Number(count.total),1);
  console.log('OPS_UX01_FINAL_EVIDENCE',JSON.stringify({mileage:{accepted:45000,rejected:[45000.5,-1,'NaN','Infinity'],persisted:Number(persisted.mileage)},planning:{http:concurrent.map(response=>response.status),occupancies:Number(count.total),capacity:1}}));
});
