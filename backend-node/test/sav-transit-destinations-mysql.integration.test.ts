import assert from'node:assert/strict';
import{after,test}from'node:test';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import supertest from'supertest';
import{createApp}from'../src/app.js';
import{pool,query}from'../src/config/database.js';
import{bootstrapDatabase}from'../src/scripts/database-bootstrap.js';
import{createMysqlActor}from'./helpers/mysql-auth-session-fixture.js';

const enabled=process.env.SAV_TRANSIT_MYSQL_TEST==='1';if(enabled)after(()=>pool.end());
test('SAV transit destinations respecte scope, agence, mapping, compte et concession',{skip:!enabled,timeout:300000},async()=>{
 assert.match(process.env.DB_NAME??'',/isolated|test|rbac114/i);assert.ok((await bootstrapDatabase()).version>=114);
 const add=async(sql:string,p:unknown[]=[])=>String((await pool.execute<ResultSetHeader>(sql,p))[0].insertId),suffix=Date.now().toString(36);
 const concession=await add('INSERT INTO concessions(name,code)VALUES(?,?)',[`Transit ${suffix}`,`TR${suffix}`]),otherConcession=await add('INSERT INTO concessions(name,code)VALUES(?,?)',[`Transit autre ${suffix}`,`TX${suffix}`]);
 const agency=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'Agence transit',`TRA${suffix}`]),otherAgency=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'Autre agence',`TRB${suffix}`]);
 const actor=await createMysqlActor({label:`Transit ${suffix}`,agencyId:agency,permissions:[{code:'service.transit.view',scope:'AGENCY'}]}),methods=await query<RowDataPacket[]>('SELECT id FROM payment_methods WHERE is_active=TRUE ORDER BY id LIMIT 5');assert.equal(methods.length,5);
 const account=await add("INSERT INTO treasury_accounts(concession_id,agency_id,attachment_type,code,name,account_type,currency_code,created_by)VALUES(?,NULL,'CONCESSION',?,?,'BANK','XAF',?)",[concession,`TC${suffix}`,'Compte autorisé',actor.userId]);
 const inactive=await add("INSERT INTO treasury_accounts(concession_id,agency_id,attachment_type,code,name,account_type,currency_code,is_active,created_by)VALUES(?,NULL,'CONCESSION',?,?,'BANK','XAF',FALSE,?)",[concession,`TI${suffix}`,'Compte inactif',actor.userId]);
 const foreignAgency=await add("INSERT INTO treasury_accounts(concession_id,agency_id,attachment_type,code,name,account_type,currency_code,created_by)VALUES(?,?,'AGENCY',?,?,'BANK','XAF',?)",[concession,otherAgency,`TA${suffix}`,'Compte autre agence',actor.userId]);
 const foreignConcession=await add("INSERT INTO treasury_accounts(concession_id,agency_id,attachment_type,code,name,account_type,currency_code,created_by)VALUES(?,NULL,'CONCESSION',?,?,'BANK','XAF',?)",[otherConcession,`TX${suffix}`,'Compte autre concession',actor.userId]);
 const map=async(method:number|string,accountId:string,active=true)=>pool.execute('INSERT INTO treasury_account_mappings(concession_id,agency_id,payment_method_id,treasury_account_id,is_active,created_by,updated_by)VALUES(?,?,?,?,?,?,?)',[concession,agency,method,accountId,active,actor.userId,actor.userId]);
 await map(methods[0]!.id,account);await map(methods[1]!.id,inactive);await map(methods[2]!.id,foreignAgency);await map(methods[3]!.id,foreignConcession);await map(methods[4]!.id,account,false);
 const api=supertest(createApp()),get=(agencyId:string,method:unknown)=>api.get('/api/sav/transit/destinations').query({agencyId,paymentMethodId:method}).set('Authorization',`Bearer ${actor.accessToken}`);
 const allowed=await get(agency,methods[0]!.id);assert.equal(allowed.status,200,allowed.text);assert.deepEqual(allowed.body.map((x:any)=>x.id),[account]);
 for(const method of methods.slice(1)){const response=await get(agency,method.id);assert.equal(response.status,200,response.text);assert.deepEqual(response.body,[])}
 assert.equal((await get(otherAgency,methods[0]!.id)).status,403);assert.equal((await get('abc',methods[0]!.id)).status,400);assert.equal((await get(agency,'abc')).status,400);
});
