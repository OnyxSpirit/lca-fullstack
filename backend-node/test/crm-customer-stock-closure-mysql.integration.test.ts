import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';
import{after,test}from'node:test';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import supertest from'supertest';
import{createApp}from'../src/app.js';
import{execute,pool,query}from'../src/config/database.js';
import{bootstrapDatabase}from'../src/scripts/database-bootstrap.js';
import{assignMysqlAgencyRole,createMysqlActor,issueMysqlAccessToken}from'./helpers/mysql-auth-session-fixture.js';

const enabled=process.env.CLOSURE_MYSQL_TEST==='1';
if(enabled)after(()=>pool.end());
const add=async(sql:string,params:unknown[]=[])=>String((await execute(sql,params)as ResultSetHeader).insertId);

test('clôture CRM Client Stock fonctionne réellement sur MySQL et HTTP',{skip:!enabled,timeout:300000},async()=>{
  assert.match(process.env.DB_NAME??'',/closure.*test/i);
  assert.ok((await bootstrapDatabase()).version>=127);
  const suffix=randomUUID().replaceAll('-','').slice(0,10),concession=await add('INSERT INTO concessions(name,code,currency_code)VALUES(?,?,?)',[`Clôture ${suffix}`,`CL${suffix}`,'XAF']),agencyA=await add('INSERT INTO agencies(concession_id,name,code,is_active)VALUES(?,?,?,TRUE)',[concession,'Source',`SA${suffix}`]),agencyB=await add('INSERT INTO agencies(concession_id,name,code,is_active)VALUES(?,?,?,TRUE)',[concession,'Destination',`DA${suffix}`]),agencyInactive=await add('INSERT INTO agencies(concession_id,name,code,is_active)VALUES(?,?,?,FALSE)',[concession,'Inactive',`IA${suffix}`]);
  const permissions=['vehicles.view','vehicles.assign_agency','vehicles.assignments.view'],actor=await createMysqlActor({label:`Closure ${suffix}`,agencyId:agencyA,permissions:permissions.map(code=>({code,scope:'AGENCY'}))});
  await assignMysqlAgencyRole({userId:actor.userId,agencyId:agencyB,roleId:actor.roleId,primary:false});
  await assignMysqlAgencyRole({userId:actor.userId,agencyId:agencyInactive,roleId:actor.roleId,primary:false});
  const sourceOnly=await createMysqlActor({label:`Source ${suffix}`,agencyId:agencyA,permissions:permissions.map(code=>({code,scope:'AGENCY'}))});
  const destinationSession=await issueMysqlAccessToken({userId:actor.userId,email:actor.email,agencyId:agencyB});
  const brand=await add('INSERT INTO brands(name,code)VALUES(?,?)',[`Marque ${suffix}`,`B${suffix}`]),model=await add('INSERT INTO models(brand_id,name,code)VALUES(?,?,?)',[brand,`Modèle ${suffix}`,`M${suffix}`]),version=await add('INSERT INTO versions(model_id,name,code)VALUES(?,?,?)',[model,`Version ${suffix}`,`V${suffix}`]),locationA=await add("INSERT INTO vehicle_locations(agency_id,name,type,created_by)VALUES(?,'Parc A','PARC',?)",[agencyA,actor.userId]),locationB=await add("INSERT INTO vehicle_locations(agency_id,name,type,created_by)VALUES(?,'Parc B','PARC',?)",[agencyB,actor.userId]);
  const vehicle=async(status:string,vin:string)=>add("INSERT INTO vehicles(version_id,agency_id,vehicle_location_id,is_commercial_stock,vehicle_type,vin,stock_number,status,entry_date,sale_price,created_by)VALUES(?,?,?,TRUE,'new',?,?,?,CURDATE(),10000000,?)",[version,agencyA,locationA,vin,`STK-${status}-${vin.slice(0,8)}`,status,actor.userId]);
  const available=await vehicle('available',`CL${suffix}0000000`.slice(0,17)),reserved=await vehicle('reserved',`CR${suffix}0000000`.slice(0,17)),sold=await vehicle('sold',`CS${suffix}0000000`.slice(0,17)),delivered=await vehicle('delivered',`CD${suffix}0000000`.slice(0,17));
  const api=supertest(createApp()),auth=(token:string,call:supertest.Test)=>call.set('Authorization',`Bearer ${token}`),init=(token:string,id:string,destination=agencyB)=>auth(token,api.post(`/api/vehicles/${id}/interagency-transfers`).send({destinationAgencyId:destination,reason:'Recette de clôture',reference:`REF-${suffix}`,observations:'Fixture isolée'}));

  assert.equal((await init(sourceOnly.accessToken,available)).status,403,'la destination exige sa propre permission');
  assert.equal((await init(actor.accessToken,reserved)).status,409);assert.equal((await init(actor.accessToken,sold)).status,409);assert.equal((await init(actor.accessToken,delivered)).status,409);
  assert.equal((await init(actor.accessToken,available,agencyInactive)).status,409,'une agence inactive est refusée');
  const created=await init(actor.accessToken,available);assert.equal(created.status,201,created.text);const transferId=String(created.body.id);
  const duplicate=await init(actor.accessToken,available);assert.equal(duplicate.status,409);
  const dispatched=await auth(actor.accessToken,api.post(`/api/vehicle-interagency-transfers/${transferId}/dispatch`));assert.equal(dispatched.status,200,dispatched.text);
  assert.equal((await init(actor.accessToken,available)).status,409,'un véhicule en transit ne peut pas être transféré');
  const wrongLocation=await auth(destinationSession.accessToken,api.post(`/api/vehicle-interagency-transfers/${transferId}/receive`).send({locationId:locationA}));assert.equal(wrongLocation.status,400);
  const received=await auth(destinationSession.accessToken,api.post(`/api/vehicle-interagency-transfers/${transferId}/receive`).send({locationId:locationB}));assert.equal(received.status,200,received.text);
  const receivedAgain=await auth(destinationSession.accessToken,api.post(`/api/vehicle-interagency-transfers/${transferId}/receive`).send({locationId:locationB}));assert.equal(receivedAgain.status,200,'la réception est idempotente');
  const[row]=await query<RowDataPacket[]>('SELECT agency_id,vehicle_location_id,status FROM vehicles WHERE id=?',[available]);assert.equal(String(row.agency_id),agencyB);assert.equal(String(row.vehicle_location_id),locationB);assert.equal(row.status,'received');
  const[history]=await query<RowDataPacket[]>('SELECT COUNT(*) total FROM vehicle_interagency_transfer_history WHERE transfer_id=?',[transferId]);assert.equal(Number(history.total),3);
  const[movements]=await query<RowDataPacket[]>('SELECT COUNT(*) total FROM vehicle_movements WHERE reference_type=? AND reference_id=?',['vehicle_interagency_transfer',transferId]);assert.equal(Number(movements.total),2);
  const[archives]=await query<RowDataPacket[]>("SELECT COUNT(*) total FROM documents WHERE entity_type='vehicle_movement' AND source_key LIKE 'vehicle-movement:%:posted:v1'");assert.ok(Number(archives.total)>=2,'les mouvements expédition/réception sont archivés en GED');

  const returnVehicle=await vehicle('available',`CT${suffix}0000000`.slice(0,17)),returnCreated=await init(actor.accessToken,returnVehicle),returnId=String(returnCreated.body.id);assert.equal(returnCreated.status,201,returnCreated.text);assert.equal((await auth(actor.accessToken,api.post(`/api/vehicle-interagency-transfers/${returnId}/dispatch`))).status,200);const cancelled=await auth(actor.accessToken,api.post(`/api/vehicle-interagency-transfers/${returnId}/cancel`).send({reason:'Retour demandé'}));assert.equal(cancelled.body.status,'RETURN_REQUIRED');const returned=await auth(actor.accessToken,api.post(`/api/vehicle-interagency-transfers/${returnId}/confirm-return`).send({locationId:locationA}));assert.equal(returned.status,200,returned.text);
  const[returnedVehicle]=await query<RowDataPacket[]>('SELECT agency_id,vehicle_location_id,status FROM vehicles WHERE id=?',[returnVehicle]);assert.equal(String(returnedVehicle.agency_id),agencyA);assert.equal(String(returnedVehicle.vehicle_location_id),locationA);assert.equal(returnedVehicle.status,'available');

  const cancelVehicle=await vehicle('available',`CC${suffix}0000000`.slice(0,17)),cancelCreated=await init(actor.accessToken,cancelVehicle),cancelId=String(cancelCreated.body.id);assert.equal(cancelCreated.status,201);assert.equal((await auth(actor.accessToken,api.post(`/api/vehicle-interagency-transfers/${cancelId}/cancel`).send({reason:'Avant départ'}))).body.status,'CANCELLED');assert.equal((await auth(actor.accessToken,api.post(`/api/vehicle-interagency-transfers/${cancelId}/cancel`).send({reason:'Répétition'}))).body.status,'CANCELLED');

  const concurrentVehicle=await vehicle('available',`CX${suffix}0000000`.slice(0,17)),race=await Promise.all([init(actor.accessToken,concurrentVehicle),init(actor.accessToken,concurrentVehicle)]);assert.deepEqual(race.map(item=>item.status).sort(),[201,409]);
});

test('contacts historisés et archivage CRM persistent via les API réelles',{skip:!enabled,timeout:120000},async()=>{
  const suffix=randomUUID().replaceAll('-','').slice(0,10),concession=await add('INSERT INTO concessions(name,code,currency_code)VALUES(?,?,?)',[`Client CRM ${suffix}`,`CC${suffix}`,'XAF']),agency=await add('INSERT INTO agencies(concession_id,name,code,is_active)VALUES(?,?,?,TRUE)',[concession,'Agence Client CRM',`AC${suffix}`]);
  const actor=await createMysqlActor({label:`Client CRM ${suffix}`,agencyId:agency,permissions:['customers.view','customers.update','crm.prospect.view','crm.prospect.update','crm.activity.view','crm.activity.create'].map(code=>({code,scope:'AGENCY'}))});
  const customer=await add("INSERT INTO customers(customer_code,agency_id,assigned_user_id,customer_type,first_name,last_name,email,created_by)VALUES(?,?,?,'individual','Alice','Clôture',?,?)",[`CLI-${suffix}`,agency,actor.userId,`alice-${suffix}@test.invalid`,actor.userId]);
  const lead=await add("INSERT INTO leads(agency_id,assigned_user_id,created_by,source,status,priority,lead_type,first_name,last_name,email)VALUES(?,?,?,'walk_in','new','medium','individual','Prospect','Clôture',?)",[agency,actor.userId,actor.userId,`prospect-${suffix}@test.invalid`]);
  const opportunity=await add("INSERT INTO opportunities(lead_id,assigned_user_id,title,stage,expected_value,probability)VALUES(?,?,?,'new',0,10)",[lead,actor.userId,`Opportunité ${suffix}`]);
  const api=supertest(createApp()),auth=(call:supertest.Test)=>call.set('Authorization',`Bearer ${actor.accessToken}`);

  const created=await auth(api.post(`/api/customers/${customer}/contacts`).send({firstName:'Bob',lastName:'Contact',roleTitle:'Direction',email:`bob-${suffix}@test.invalid`,phone:'+242060000000',isPrimary:true}));assert.equal(created.status,201,created.text);const contact=String(created.body.id);
  assert.equal((await auth(api.patch(`/api/customers/${customer}/contacts/${contact}`).send({roleTitle:'Direction générale'}))).status,200);
  assert.equal((await auth(api.post(`/api/customers/${customer}/contacts/${contact}/deactivate`).send({reason:'Recette'}))).status,200);
  assert.equal((await auth(api.post(`/api/customers/${customer}/contacts/${contact}/deactivate`).send({reason:'Répétition'}))).status,200,'la désactivation est idempotente');
  const inactive=await auth(api.get(`/api/customers/${customer}/contacts?state=inactive`));assert.equal(inactive.status,200);assert.equal(inactive.body.length,1);assert.equal(inactive.body[0].isActive,false);
  assert.equal((await auth(api.delete(`/api/customers/${customer}/contacts/${contact}`))).status,410);
  assert.equal((await auth(api.post(`/api/customers/${customer}/contacts/${contact}/reactivate`))).status,200);
  assert.equal((await auth(api.post(`/api/customers/${customer}/contacts/${contact}/reactivate`))).status,200,'la réactivation est idempotente');
  const history=await auth(api.get(`/api/customers/${customer}/contacts/${contact}/history`));assert.equal(history.status,200,history.text);assert.deepEqual(history.body.map((item:{action:string})=>item.action).sort(),['CREATED','DEACTIVATED','REACTIVATED','UPDATED'].sort());
  const[contactState]=await query<RowDataPacket[]>('SELECT is_active,deactivated_at,deactivation_reason,reactivated_at FROM customer_contacts WHERE id=?',[contact]);assert.equal(Boolean(contactState.is_active),true);assert.equal(contactState.deactivated_at,null);assert.equal(contactState.deactivation_reason,null);assert.ok(contactState.reactivated_at);

  const archived=await auth(api.post(`/api/leads/${lead}/archive`).send({reason:'Archivage de recette'}));assert.equal(archived.status,200,archived.text);assert.equal(archived.body.isArchived,true);
  assert.equal((await auth(api.post(`/api/leads/${lead}/archive`).send({reason:'Double archivage'}))).status,200,'le double archivage est idempotent');
  const activeList=await auth(api.get('/api/leads'));assert.equal(activeList.status,200);assert.ok(!(activeList.body.items??activeList.body).some((item:{id:string})=>String(item.id)===lead));
  const allList=await auth(api.get('/api/leads?archive=all'));assert.ok((allList.body.items??allList.body).some((item:{id:string})=>String(item.id)===lead));
  const[archivedOpportunity]=await query<RowDataPacket[]>('SELECT stage FROM opportunities WHERE id=?',[opportunity]);assert.equal(archivedOpportunity.stage,'new','l’archivage ne transforme pas l’opportunité en perdue');
  const reactivated=await auth(api.post(`/api/leads/${lead}/reactivate`));assert.equal(reactivated.status,200,reactivated.text);assert.equal(reactivated.body.isArchived,false);assert.equal((await auth(api.post(`/api/leads/${lead}/reactivate`))).status,200,'la double réactivation est idempotente');
  const[activities]=await query<RowDataPacket[]>("SELECT COUNT(*) total FROM activities WHERE lead_id=? AND subject IN('Prospect archivé','Prospect réactivé')",[lead]);assert.equal(Number(activities.total),2);
});
