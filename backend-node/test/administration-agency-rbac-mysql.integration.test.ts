import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';
import{after,test}from'node:test';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import supertest from'supertest';
import{createApp}from'../src/app.js';
import{execute,pool,query}from'../src/config/database.js';
import{bootstrapDatabase}from'../src/scripts/database-bootstrap.js';
import{ensureMysqlSystemAdministrator,issueMysqlAccessToken}from'./helpers/mysql-auth-session-fixture.js';

const enabled=process.env.ADMIN_AGENCY_MYSQL_TEST==='1';if(enabled)after(()=>pool.end());
const add=async(sql:string,params:unknown[]=[])=>String((await pool.execute<ResultSetHeader>(sql,params))[0].insertId);

test('PH2C2B LOT2 administration centrale et habilitations locales',{skip:!enabled,timeout:300000},async()=>{
 assert.match(process.env.DB_NAME??'',/isolated|test|phase2c2b/i);assert.ok((await bootstrapDatabase()).version>=115);
 const suffix=randomUUID().replaceAll('-','').slice(0,10),concession=await add('INSERT INTO concessions(name,code)VALUES(?,?)',[`A22 ${suffix}`,`A22${suffix}`]),a1=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'A22 A',`A${suffix}`]),a2=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'A22 B',`B${suffix}`]);
 const permissionIds=Object.fromEntries((await query<RowDataPacket[]>("SELECT id,code FROM permissions WHERE code IN ('users.view','users.assign_agency','users.assign_role','roles.view')")).map(row=>[String(row.code),String(row.id)]));
 const managerRole=await add('INSERT INTO roles(name,code,is_system,is_active)VALUES(?,?,FALSE,TRUE)',[`A22 manager ${suffix}`,`A22_MANAGER_${suffix}`]);for(const code of Object.keys(permissionIds))await execute("INSERT INTO role_permissions(role_id,permission_id,scope)VALUES(?,?,'AGENCY')",[managerRole,permissionIds[code]]);
 const delegatedRole=await add('INSERT INTO roles(name,code,is_system,is_active)VALUES(?,?,FALSE,TRUE)',[`A22 delegated ${suffix}`,`A22_DELEGATED_${suffix}`]);await execute("INSERT INTO role_permissions(role_id,permission_id,scope)VALUES(?,?,'OWN')",[delegatedRole,permissionIds['users.view']]);
 const forbiddenRole=await add('INSERT INTO roles(name,code,is_system,is_active)VALUES(?,?,FALSE,TRUE)',[`A22 forbidden ${suffix}`,`A22_FORBIDDEN_${suffix}`]);await execute("INSERT INTO role_permissions(role_id,permission_id,scope)VALUES(?,?,'GLOBAL')",[forbiddenRole,permissionIds['users.view']]);
 const managerEmail=`a22-manager-${suffix}@test.local`,manager=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'A22','Manager',?,'unused',TRUE)",[a1,managerEmail]),targetEmail=`a22-target-${suffix}@test.local`,target=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'A22','Target',?,'unused',TRUE)",[a1,targetEmail]);
 await execute('INSERT INTO user_roles(user_id,role_id)VALUES(?,?),(?,?)',[manager,managerRole,target,delegatedRole]);const managerUa=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,TRUE,'ACTIVE')",[manager,a1]),targetA1=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,TRUE,'ACTIVE')",[target,a1]),targetA2=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,FALSE,'ACTIVE')",[target,a2]);await execute('INSERT INTO user_agency_roles(user_agency_id,role_id)VALUES(?,?),(?,?)',[managerUa,managerRole,targetA2,delegatedRole]);
 const managerSession=await issueMysqlAccessToken({userId:manager,email:managerEmail,agencyId:a1}),system=await ensureMysqlSystemAdministrator(),api=supertest(createApp()),auth=(token:string,call:supertest.Test)=>call.set('Authorization',`Bearer ${token}`);
 let response=await auth(managerSession.accessToken,api.get(`/api/users/${target}/agencies`));assert.equal(response.status,200,response.text);assert.deepEqual(response.body.map((row:any)=>row.agencyId),[a1]);
 assert.equal((await auth(managerSession.accessToken,api.patch(`/api/users/${target}/agencies/${targetA2}/status`).send({isActive:false}))).status,403);
 response=await auth(managerSession.accessToken,api.post(`/api/users/${target}/agencies/${targetA1}/roles`).send({roleId:delegatedRole}));assert.equal(response.status,201,response.text);assert.ok(response.body[0].roles.some((role:any)=>role.id===delegatedRole));
 assert.equal((await auth(managerSession.accessToken,api.post(`/api/users/${target}/agencies/${targetA1}/roles`).send({roleId:forbiddenRole}))).status,403);
 response=await auth(managerSession.accessToken,api.delete(`/api/users/${target}/agencies/${targetA1}/roles/${delegatedRole}`));assert.equal(response.status,200,response.text);assert.equal(response.body[0].roles.length,0);
 assert.equal((await auth(managerSession.accessToken,api.post('/api/agencies').send({name:'Interdite',code:`X${suffix}`}))).status,403);
 response=await auth(system.accessToken,api.post('/api/agencies').send({name:`Centrale ${suffix}`,code:`C${suffix}`,concessionId:concession}));assert.equal(response.status,201,response.text);const createdAgency=String(response.body.agencyId);assert.ok(createdAgency);
 const roleCode=`A22_CENTRAL_${suffix}`;response=await auth(system.accessToken,api.post('/api/roles').send({name:`Central ${suffix}`,code:roleCode,permissions:[]}));assert.equal(response.status,201,response.text);const centralRole=String(response.body.id);assert.ok(centralRole);
 assert.equal((await auth(system.accessToken,api.patch(`/api/roles/${centralRole}`).send({name:`Central modifié ${suffix}`}))).status,200);assert.equal((await auth(system.accessToken,api.patch(`/api/roles/${centralRole}/status`).send({isActive:false}))).status,200);assert.equal((await auth(system.accessToken,api.delete(`/api/roles/${centralRole}`))).status,200);
 const fakeRole=await add('INSERT INTO roles(name,code,is_system,is_active)VALUES(?,?,TRUE,TRUE)',[`Fake ${suffix}`,`SUPER_ADMIN_FAKE_${suffix}`]),fakeEmail=`fake-${suffix}@test.local`,fake=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'Fake','Admin',?,'unused',TRUE)",[a1,fakeEmail]);await execute('INSERT INTO user_roles(user_id,role_id)VALUES(?,?)',[fake,fakeRole]);const fakeUa=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,TRUE,'ACTIVE')",[fake,a1]);await execute('INSERT INTO user_agency_roles(user_agency_id,role_id)VALUES(?,?)',[fakeUa,managerRole]);const fakeSession=await issueMysqlAccessToken({userId:fake,email:fakeEmail,agencyId:a1});assert.equal((await auth(fakeSession.accessToken,api.post('/api/agencies').send({name:'Fausse',code:`F${suffix}`}))).status,403);
 await execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=?',[managerSession.sid]);assert.equal((await auth(managerSession.accessToken,api.get(`/api/users/${target}/agencies`))).status,401);
 assert.equal((await query<RowDataPacket[]>('SELECT COUNT(*) total FROM user_agency_roles WHERE user_agency_id=?',[targetA2]))[0]?.total,'1');
 await auth(system.accessToken,api.patch(`/api/agencies/${createdAgency}/status`).send({isActive:false}));
});
