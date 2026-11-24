import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';
import{after,test}from'node:test';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import supertest from'supertest';
import{createApp}from'../src/app.js';
import{execute,pool,query}from'../src/config/database.js';
import{bootstrapDatabase}from'../src/scripts/database-bootstrap.js';
import{assignMysqlAgencyRole,issueMysqlAccessToken}from'./helpers/mysql-auth-session-fixture.js';

const enabled=process.env.RBAC_ROLES_MYSQL_TEST==='1';if(enabled)after(()=>pool.end());
const add=async(sql:string,params:unknown[]=[])=>String((await pool.execute<ResultSetHeader>(sql,params))[0].insertId);
const one=async(sql:string,params:unknown[]=[])=>(await query<RowDataPacket[]>(sql,params))[0];

test('cycle statut rôle, permissions, sessions et multi-agences sur MySQL 8.4',{skip:!enabled,timeout:300000},async()=>{
 assert.match(process.env.DB_NAME??'',/rbac_roles_isolated/);assert.ok((await bootstrapDatabase()).version>=133);
 const suffix=randomUUID().replaceAll('-','').slice(0,10),concession=await add('INSERT INTO concessions(name,code)VALUES(?,?)',[`RBAC ${suffix}`,`RB${suffix}`]),a1=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'RBAC Agence A',`RA${suffix}`]),a2=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'RBAC Agence B',`RB${suffix}`]);
 const systemRole=await one("SELECT id FROM roles WHERE code='SUPER_ADMIN' AND is_system=TRUE AND is_active=TRUE"),adminEmail=`rbac-admin-${suffix}@test.local`,admin=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'RBAC','Admin',?,'unused',TRUE)",[a1,adminEmail]);await execute('INSERT INTO user_roles(user_id,role_id)VALUES(?,?)',[admin,systemRole.id]);const adminSession=await issueMysqlAccessToken({userId:admin,email:adminEmail,agencyId:a1,twoFactorVerified:true}),api=supertest(createApp()),auth=(token:string,call:supertest.Test)=>call.set('Authorization',`Bearer ${token}`);
 const permission=await one("SELECT id FROM permissions WHERE code='roles.view' AND is_active=TRUE"),created=await auth(adminSession.accessToken,api.post('/api/roles')).send({name:`Rôle qualification ${suffix}`,code:`RBAC_ROLE_${suffix}`,permissions:[{permissionId:String(permission.id),scope:'AGENCY'}]});assert.equal(created.status,201,created.text);assert.equal(created.body.is_active,true);const roleId=String(created.body.id);
 const targetEmail=`rbac-target-${suffix}@test.local`,target=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'RBAC','Target',?,'unused',TRUE)",[a1,targetEmail]),assignmentA1=await assignMysqlAgencyRole({userId:target,agencyId:a1,roleId,primary:true}),assignmentA2=await assignMysqlAgencyRole({userId:target,agencyId:a2,roleId,primary:false}),targetSession=await issueMysqlAccessToken({userId:target,email:targetEmail,agencyId:a1});
 assert.equal((await auth(targetSession.accessToken,api.get('/api/roles'))).status,200);
 const before={permissions:Number((await one('SELECT COUNT(*) total FROM role_permissions WHERE role_id=?',[roleId])).total),assignments:Number((await one('SELECT COUNT(*) total FROM user_agency_roles WHERE role_id=?',[roleId])).total)};assert.equal(before.permissions,1);assert.equal(before.assignments,2);
 let response=await auth(adminSession.accessToken,api.patch(`/api/roles/${roleId}/status`)).send({isActive:false});assert.equal(response.status,200,response.text);assert.equal(response.body.is_active,false);assert.equal(Boolean((await one('SELECT is_active FROM roles WHERE id=?',[roleId])).is_active),false);assert.equal((await auth(adminSession.accessToken,api.get(`/api/roles/${roleId}/permissions`))).body.is_active,false);assert.equal((await auth(targetSession.accessToken,api.get('/api/roles'))).status,403);
 assert.deepEqual({permissions:Number((await one('SELECT COUNT(*) total FROM role_permissions WHERE role_id=?',[roleId])).total),assignments:Number((await one('SELECT COUNT(*) total FROM user_agency_roles WHERE role_id=?',[roleId])).total)},before);assert.equal(Boolean((await one('SELECT is_active FROM users WHERE id=?',[target])).is_active),true);
 response=await auth(adminSession.accessToken,api.patch(`/api/roles/${roleId}/status`)).send({isActive:false});assert.equal(response.status,200);assert.equal(response.body.is_active,false);
 const inactiveAssignment=await auth(adminSession.accessToken,api.post(`/api/users/${target}/agencies/${assignmentA1}/roles`)).send({roleId});assert.equal(inactiveAssignment.status,400,inactiveAssignment.text);
 response=await auth(adminSession.accessToken,api.patch(`/api/roles/${roleId}/status`)).send({isActive:true});assert.equal(response.status,200,response.text);assert.equal(response.body.is_active,true);assert.equal(Boolean((await one('SELECT is_active FROM roles WHERE id=?',[roleId])).is_active),true);assert.equal((await auth(targetSession.accessToken,api.get('/api/roles'))).status,200);
 response=await auth(targetSession.accessToken,api.put('/api/rbac/agency-context')).send({agencyId:a2});assert.equal(response.status,200,response.text);assert.equal(response.body.activeAgencyId,a2);assert.equal((await auth(targetSession.accessToken,api.get('/api/roles'))).status,200);assert.ok(assignmentA2);
 assert.equal((await auth(targetSession.accessToken,api.patch(`/api/roles/${roleId}/status`)).send({isActive:false})).status,403);assert.equal((await auth(adminSession.accessToken,api.patch(`/api/roles/${systemRole.id}/status`)).send({isActive:false})).status,403);assert.equal((await auth(adminSession.accessToken,api.patch(`/api/roles/${roleId}`).send({permissions:[{permissionId:String(permission.id),scope:'GLOBAL'}]}))).status,400);
 const audits=await query<RowDataPacket[]>("SELECT action,old_values,new_values,user_id,agency_id FROM audit_logs WHERE entity_type='role' AND entity_id=? AND action IN('role.disabled','role.activated') ORDER BY id",[roleId]);assert.ok(audits.length>=3);assert.ok(audits.some(row=>row.action==='role.disabled'&&String(row.user_id)===admin));assert.ok(audits.some(row=>row.action==='role.activated'&&String(row.agency_id)===a1));
});
