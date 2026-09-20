import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {after,test} from 'node:test';
import supertest from 'supertest';
import type {ResultSetHeader,RowDataPacket} from 'mysql2/promise';
import {createApp} from '../src/app.js';
import {pool,query} from '../src/config/database.js';

const enabled=process.env.LCA_SAV19_DB_TEST==='1';
if(enabled)after(async()=>pool.end());
const rows=(sql:string,params:unknown[]=[])=>query<RowDataPacket[]>(sql,params);
const insert=async(sql:string,params:unknown[]=[])=>String((await pool.execute<ResultSetHeader>(sql,params))[0].insertId);

test('SAV-OR-19 : toutes les interventions restent dans l’historique avec leurs scopes',{skip:!enabled},async()=>{
  const api=supertest(createApp()),suffix=randomUUID().slice(0,8),password=process.env.ADMIN_PASSWORD!;
  const adminLogin=await api.post('/api/auth/login').send({email:process.env.ADMIN_EMAIL,password});assert.equal(adminLogin.status,200,JSON.stringify(adminLogin.body));
  const [admin]=await rows('SELECT id,password_hash,agency_id FROM users WHERE email=?',[process.env.ADMIN_EMAIL]);
  const [baseAgency]=await rows('SELECT concession_id FROM agencies WHERE id=?',[admin.agency_id]);
  const sameAgency=await insert('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[baseAgency.concession_id,'Agence sœur SAV19',`AS19_${suffix}`]);
  const otherConcession=await insert('INSERT INTO concessions(name,code) VALUES(?,?)',['Concession hors périmètre',`CS19_${suffix}`]);
  const otherAgency=await insert('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[otherConcession,'Agence hors périmètre',`AH19_${suffix}`]);
  const [permission]=await rows("SELECT id FROM permissions WHERE code='workshop.intervention.view'");
  const makeUser=async(label:string,agency:string,scope?:'AGENCY'|'CONCESSION')=>{
    const email=`${label}-${suffix}@test.local`,user=await insert('INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active) VALUES(?,?,?,?,?,TRUE)',[agency,label,'SAV19',email,admin.password_hash]);
    const role=await insert('INSERT INTO roles(code,name,is_active,is_system) VALUES(?,?,TRUE,FALSE)',[`S19_${label}_${suffix}`,`SAV19 ${label} ${suffix}`]);if(scope)await pool.execute('INSERT INTO role_permissions(role_id,permission_id,scope) VALUES(?,?,?)',[role,permission.id,scope]);await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[user,role]);
    return{user,email,role};
  };
  const agencyReader=await makeUser('agency',String(admin.agency_id),'AGENCY'),concessionReader=await makeUser('concession',String(admin.agency_id),'CONCESSION'),deniedReader=await makeUser('denied',String(admin.agency_id));
  const tech1=await makeUser('tech1',String(admin.agency_id)),tech2=await makeUser('tech2',String(admin.agency_id));
  await pool.execute("INSERT INTO role_permissions(role_id,permission_id,scope) VALUES(?,?,'OWN')",[tech1.role,permission.id]);
  const technician1=await insert('INSERT INTO technicians(user_id,agency_id,employee_code) VALUES(?,?,?)',[tech1.user,admin.agency_id,`T1_${suffix}`]),technician2=await insert('INSERT INTO technicians(user_id,agency_id,employee_code) VALUES(?,?,?)',[tech2.user,admin.agency_id,`T2_${suffix}`]);
  const brand=await insert('INSERT INTO brands(name,code) VALUES(?,?)',[`SAV19 ${suffix}`,`B19_${suffix}`]),model=await insert('INSERT INTO models(brand_id,name) VALUES(?,?)',[brand,'Modèle']),version=await insert('INSERT INTO versions(model_id,name) VALUES(?,?)',[model,'Version']);
  const makeOrder=async(agency:string,label:string)=>{const customer=await insert('INSERT INTO customers(customer_code,agency_id,first_name,last_name) VALUES(?,?,?,?)',[`C19_${label}_${suffix}`,agency,'Client',label]),vehicle=await insert('INSERT INTO vehicles(version_id,agency_id,vin) VALUES(?,?,?)',[version,agency,`S19${label}${suffix}VIN`]);return insert("INSERT INTO repair_orders(order_number,customer_id,vehicle_id,agency_id,status,created_by) VALUES(?,?,?,?, 'in_progress',?)",[`OR-${label}-${suffix}`,customer,vehicle,agency,admin.id]);};
  const repairOrder=await makeOrder(String(admin.agency_id),'MAIN'),sameConcessionOrder=await makeOrder(sameAgency,'SAME'),outsideOrder=await makeOrder(otherAgency,'OUT');
  const bay1=await insert('INSERT INTO workshop_bays(agency_id,name,bay_type) VALUES(?,?,?)',[admin.agency_id,`Pont 1 ${suffix}`,'lift']),bay2=await insert('INSERT INTO workshop_bays(agency_id,name,bay_type) VALUES(?,?,?)',[admin.agency_id,`Pont 2 ${suffix}`,'lift']);
  const descriptions=['Intervention A','Intervention B','Intervention C'];
  const interventions:string[]=[];
  for(let index=0;index<descriptions.length;index++){
    const technician=index===1?technician2:technician1,bay=index===1?bay2:bay1;
    const intervention=await insert("INSERT INTO interventions(repair_order_id,technician_id,description,planned_hours,status) VALUES(?,?,?,?, 'in_progress')",[repairOrder,technician,descriptions[index],1]);interventions.push(intervention);
    await pool.execute("INSERT INTO schedules(agency_id,technician_id,bay_id,repair_order_id,intervention_id,starts_at,ends_at,status,created_by) VALUES(?,?,?,?,?,DATE_ADD('2026-09-19 08:00:00',INTERVAL ? HOUR),DATE_ADD('2026-09-19 09:00:00',INTERVAL ? HOUR),'confirmed',?)",[admin.agency_id,technician,bay,repairOrder,intervention,index,index,admin.id]);
    const session=await insert("INSERT INTO work_sessions(repair_order_id,technician_id,intervention_id,bay_id,started_at,ended_at,status,created_by) VALUES(?,?,?,?,DATE_ADD('2026-09-19 08:00:00',INTERVAL ? HOUR),DATE_ADD('2026-09-19 09:00:00',INTERVAL ? HOUR),'completed',?)",[repairOrder,technician,intervention,bay,index,index,admin.id]);
    await pool.execute("INSERT INTO time_entries(technician_id,repair_order_id,intervention_id,work_session_id,entry_date,hours,productive) VALUES(?,?,?,?, '2026-09-19',1,TRUE)",[technician,repairOrder,intervention,session]);
  }
  await pool.execute("UPDATE interventions SET status='completed',actual_hours=1 WHERE repair_order_id=?",[repairOrder]);
  const sameIntervention=await insert("INSERT INTO interventions(repair_order_id,description,status) VALUES(?,'Même concession','completed')",[sameConcessionOrder]);
  const outsideIntervention=await insert("INSERT INTO interventions(repair_order_id,description,status) VALUES(?,'Hors concession','completed')",[outsideOrder]);
  const login=async(email:string)=>{const response=await api.post('/api/auth/login').send({email,password});assert.equal(response.status,200,JSON.stringify(response.body));return response.body.accessToken as string;};
  const get=async(token:string,path='/api/workshop/interventions/history')=>api.get(path).set('Authorization',`Bearer ${token}`);
  const agencyToken=await login(agencyReader.email),agencyHistory=await get(agencyToken,`/api/workshop/interventions/history?repairOrderId=${repairOrder}`);assert.equal(agencyHistory.status,200,JSON.stringify(agencyHistory.body));assert.deepEqual(agencyHistory.body.map((row:{description:string})=>row.description).sort(),descriptions);assert.equal(new Set(agencyHistory.body.map((row:{id:string})=>row.id)).size,3);assert.deepEqual(new Set(agencyHistory.body.map((row:{status:string})=>row.status)),new Set(['completed']));assert.equal(new Set(agencyHistory.body.map((row:{technician_name:string})=>row.technician_name)).size,2);assert.equal(new Set(agencyHistory.body.map((row:{bay_names:string})=>row.bay_names)).size,2);
  const agencyAll=await get(agencyToken);assert.equal(agencyAll.status,200);assert.ok(interventions.every(id=>agencyAll.body.some((row:{id:string})=>row.id===id)));assert.ok(!agencyAll.body.some((row:{id:string})=>row.id===sameIntervention||row.id===outsideIntervention));
  const concessionHistory=await get(await login(concessionReader.email));assert.equal(concessionHistory.status,200);assert.ok(concessionHistory.body.some((row:{id:string})=>row.id===sameIntervention));assert.ok(!concessionHistory.body.some((row:{id:string})=>row.id===outsideIntervention));
  const ownHistory=await get(await login(tech1.email));assert.equal(ownHistory.status,200);assert.deepEqual(ownHistory.body.filter((row:{id:string})=>interventions.includes(row.id)).map((row:{description:string})=>row.description).sort(),['Intervention A','Intervention C']);
  assert.equal((await get(await login(deniedReader.email))).status,403);
  console.log('SAV_OR19_API_EVIDENCE',JSON.stringify(agencyHistory.body.map((row:{id:string;description:string;technician_name:string;bay_names:string;status:string;duration_hours:string})=>({id:row.id,description:row.description,technician:row.technician_name,bay:row.bay_names,status:row.status,durationHours:Number(row.duration_hours)}))));
  console.log('SAV_OR19_SCOPE_EVIDENCE',JSON.stringify({agencyVisible:agencyAll.body.length,concessionVisible:concessionHistory.body.length,ownMainDescriptions:ownHistory.body.filter((row:{id:string})=>interventions.includes(row.id)).map((row:{description:string})=>row.description)}));
});
