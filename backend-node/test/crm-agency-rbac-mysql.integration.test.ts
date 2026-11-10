import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';
import{after,test}from'node:test';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import supertest from'supertest';
import{createApp}from'../src/app.js';
import{execute,pool,query}from'../src/config/database.js';
import{bootstrapDatabase}from'../src/scripts/database-bootstrap.js';
import{issueMysqlAccessToken}from'./helpers/mysql-auth-session-fixture.js';

const enabled=process.env.CRM_AGENCY_MYSQL_TEST==='1';if(enabled)after(()=>pool.end());
const add=async(sql:string,params:unknown[]=[])=>String((await pool.execute<ResultSetHeader>(sql,params))[0].insertId);

test('RBAC CRM isole les agences et revalide les écritures',{skip:!enabled,timeout:300000},async()=>{
 assert.match(process.env.DB_NAME??'',/isolated|test|rbac/i);assert.ok((await bootstrapDatabase()).version>=116);
 const suffix=randomUUID().replaceAll('-','').slice(0,10),concession=await add('INSERT INTO concessions(name,code)VALUES(?,?)',[`CRM ${suffix}`,`CRM${suffix}`]),agencyA=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'CRM A',`CA${suffix}`]),agencyB=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'CRM B',`CB${suffix}`]);
 const permissions=['crm.prospect.view','crm.prospect.create','crm.prospect.update','crm.prospect.assign','crm.pipeline.advance','crm.prospect.lose','crm.activity.view','crm.activity.create','crm.appointment.create'],permissionRows=await query<RowDataPacket[]>(`SELECT id,code FROM permissions WHERE code IN (${permissions.map(()=>'?').join(',')})`,permissions);assert.equal(permissionRows.length,permissions.length);
 const agencyRole=await add('INSERT INTO roles(name,code,is_system,is_active)VALUES(?,?,FALSE,TRUE)',[`CRM agency ${suffix}`,`CRM_AGENCY_${suffix}`]),ownRole=await add('INSERT INTO roles(name,code,is_system,is_active)VALUES(?,?,FALSE,TRUE)',[`CRM own ${suffix}`,`CRM_OWN_${suffix}`]);
 for(const permission of permissionRows){await execute("INSERT INTO role_permissions(role_id,permission_id,scope)VALUES(?,?,'AGENCY')",[agencyRole,permission.id]);await execute("INSERT INTO role_permissions(role_id,permission_id,scope)VALUES(?,?,'OWN')",[ownRole,permission.id])}
 const actorEmail=`crm-a-${suffix}@test.local`,actor=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'CRM','Actor',?,'unused',TRUE)",[agencyA,actorEmail]),colleague=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'CRM','Colleague',?,'unused',TRUE)",[agencyA,`crm-c-${suffix}@test.local`]),foreignEmail=`crm-b-${suffix}@test.local`,foreign=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'CRM','Foreign',?,'unused',TRUE)",[agencyB,foreignEmail]);
 await execute('INSERT INTO user_roles(user_id,role_id)VALUES(?,?),(?,?),(?,?)',[actor,agencyRole,colleague,ownRole,foreign,agencyRole]);
 const actorUaA=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,TRUE,'ACTIVE')",[actor,agencyA]),actorUaB=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,FALSE,'ACTIVE')",[actor,agencyB]),colleagueUa=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,TRUE,'ACTIVE')",[colleague,agencyA]),foreignUa=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,TRUE,'ACTIVE')",[foreign,agencyB]);
 await execute('INSERT INTO user_agency_roles(user_agency_id,role_id)VALUES(?,?),(?,?),(?,?),(?,?)',[actorUaA,agencyRole,actorUaB,agencyRole,colleagueUa,ownRole,foreignUa,agencyRole]);
 const actorSession=await issueMysqlAccessToken({userId:actor,email:actorEmail,agencyId:agencyA}),foreignSession=await issueMysqlAccessToken({userId:foreign,email:foreignEmail,agencyId:agencyB}),api=supertest(createApp()),auth=(token:string,call:supertest.Test)=>call.set('Authorization',`Bearer ${token}`),body={title:'Prospect RBAC',firstName:'Jean',lastName:'Test',phone:'+242060000001',assignedUserId:colleague};
 let response=await auth(actorSession.accessToken,api.post('/api/leads').send(body));assert.equal(response.status,201,response.text);const leadId=String(response.body.id);assert.equal(String(response.body.agencyId),agencyA);assert.equal(String(response.body.assignedUserId),colleague);
 response=await auth(actorSession.accessToken,api.get(`/api/leads/${leadId}`));assert.equal(response.status,200,response.text);
 assert.equal((await auth(foreignSession.accessToken,api.get(`/api/leads/${leadId}`))).status,404);
 assert.equal((await auth(foreignSession.accessToken,api.patch(`/api/leads/${leadId}`).send({notes:'intrusion'}))).status,404);
 response=await auth(actorSession.accessToken,api.post('/api/activities').send({leadId,type:'note',subject:'Suivi'}));assert.equal(response.status,201,response.text);
 response=await auth(actorSession.accessToken,api.patch(`/api/leads/${leadId}/stage`).send({stage:'contacted'}));assert.equal(response.status,200,response.text);
 assert.equal(String((await query<RowDataPacket[]>('SELECT agency_id FROM leads WHERE id=?',[leadId]))[0]?.agency_id),agencyA);
 response=await auth(actorSession.accessToken,api.put('/api/rbac/agency-context').send({agencyId:agencyB}));assert.equal(response.status,200,response.text);assert.equal((await auth(actorSession.accessToken,api.get(`/api/leads/${leadId}`))).status,404);
 await execute('DELETE FROM user_agency_roles WHERE user_agency_id=? AND role_id=?',[actorUaB,agencyRole]);assert.equal((await auth(actorSession.accessToken,api.post('/api/leads').send({...body,assignedUserId:foreign}))).status,403);
});
