import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import mysql,{type Connection, type RowDataPacket} from 'mysql2/promise';
import {bootstrapDatabase} from '../src/scripts/database-bootstrap.js';
import {ensureCustomer} from '../src/modules/quotations/quotation.service.js';

const enabled=process.env.CUSTOMER_IDENTITY_MYSQL_TEST==='1';

test('C/CC identité customer — invariants réels MySQL 8.4',{skip:!enabled,timeout:300_000},async()=>{
  const originalLog=console.log;console.log=()=>undefined;
  const schema=`lca_customer_identity_${randomUUID().replaceAll('-','').slice(0,12)}`;
  const config={host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??''};
  const admin=await mysql.createConnection(config),connections:Connection[]=[];
  const connect=async()=>{const connection=await mysql.createConnection({...config,database:schema});connections.push(connection);return connection};
  const customer=async(connection:Connection,code:string,agency:string,email:string|null,phone:string|null,type='individual')=>connection.execute(`INSERT INTO customers(customer_code,customer_type,agency_id,last_name,company_name,email,phone) VALUES(?,?,?,?,?,?,?)`,[code,type,agency,type==='individual'?'Client':null,type==='company'?'Entreprise':null,email,phone]);
  const succeeds=async(promises:Promise<unknown>[])=>{const results=await Promise.allSettled(promises);return{fulfilled:results.filter(result=>result.status==='fulfilled').length,rejected:results.filter(result=>result.status==='rejected').length};};
  try{
    await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    Object.assign(process.env,{DB_HOST:config.host,DB_PORT:String(config.port),DB_USER:config.user,DB_PASSWORD:config.password,DB_NAME:schema,DATABASE_ROOT:new URL('../database',import.meta.url).pathname});
    assert.equal((await bootstrapDatabase()).version,45);
    const setup=await connect();
    const[concession]=await setup.execute<any>('INSERT INTO concessions(name,code) VALUES(?,?)',['Audit 003',`C_${schema}`]);
    const[a]=await setup.execute<any>('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[concession.insertId,'Agence A',`A_${schema}`]);
    const[b]=await setup.execute<any>('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[concession.insertId,'Agence B',`B_${schema}`]);
    const agencyA=String(a.insertId),agencyB=String(b.insertId);
    const[user]=await setup.execute<any>('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[agencyA,'Test','CRM',`crm-${schema}@example.com`,'not-used']);
    const request={user:{sub:String(user.insertId),agencyId:agencyA},rbac:{isSuperAdmin:false,permissions:new Map([['customers.create','AGENCY']])}} as any;

    await customer(setup,'D1',agencyA,' seul@example.com ',null);
    await customer(setup,'D2',agencyA,null,'06 111-22-33');
    await customer(setup,'D3',agencyA,'both@example.com','06.222.33.44');
    await customer(setup,'D4',agencyA,null,'063334455');
    await customer(setup,'D5',agencyA,'phone-null@example.com',null);
    await customer(setup,'D7',agencyA,'company@example.com','064445566','company');
    await customer(setup,'D8',agencyB,' SEUL@example.com ','06 111-22-33');
    await assert.rejects(customer(setup,'D9E',agencyA,'SEUL@EXAMPLE.COM',null),error=>(error as any).code==='ER_DUP_ENTRY');
    await assert.rejects(customer(setup,'D9P',agencyA,null,'06-111 22.33'),error=>(error as any).code==='ER_DUP_ENTRY');
    await customer(setup,'NATIONAL',agencyA,null,'061234567');
    await customer(setup,'INTERNATIONAL',agencyA,null,'+242061234567');

    const c1=await connect(),c2=await connect();
    assert.deepEqual(await succeeds([
      customer(c1,'CC1A',agencyA,'race-email@example.com',null),
      customer(c2,'CC1B',agencyA,' RACE-EMAIL@EXAMPLE.COM ',null),
    ]),{fulfilled:1,rejected:1});
    assert.deepEqual(await succeeds([
      customer(c1,'CC2A',agencyA,null,'06 777-88-99'),
      customer(c2,'CC2B',agencyA,null,'067778899'),
    ]),{fulfilled:1,rejected:1});
    const[x]=await setup.execute<any>('INSERT INTO customers(customer_code,agency_id,last_name,email) VALUES(?,?,?,?)',['CC3X',agencyA,'X','cc3-x@example.com']);
    assert.deepEqual(await succeeds([
      customer(c1,'CC3NEW',agencyA,'cc3-target@example.com',null),
      c2.execute('UPDATE customers SET email=? WHERE id=?',['CC3-TARGET@EXAMPLE.COM',x.insertId]),
    ]),{fulfilled:1,rejected:1});
    const[u1]=await setup.execute<any>('INSERT INTO customers(customer_code,agency_id,last_name,email) VALUES(?,?,?,?)',['CC4A',agencyA,'A','cc4-a@example.com']);
    const[u2]=await setup.execute<any>('INSERT INTO customers(customer_code,agency_id,last_name,email) VALUES(?,?,?,?)',['CC4B',agencyA,'B','cc4-b@example.com']);
    assert.deepEqual(await succeeds([
      c1.execute('UPDATE customers SET phone=? WHERE id=?',['06 999-00-11',u1.insertId]),
      c2.execute('UPDATE customers SET phone=? WHERE id=?',['069990011',u2.insertId]),
    ]),{fulfilled:1,rejected:1});
    assert.deepEqual(await succeeds([
      customer(c1,'CC5A',agencyA,'cross-race@example.com','061010101'),
      customer(c2,'CC5B',agencyB,'CROSS-RACE@EXAMPLE.COM','06 10 10 10 1'),
    ]),{fulfilled:2,rejected:0});

    const[checks]=await setup.query<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM customers WHERE normalized_email='race-email@example.com' AND agency_id=?) cc1,
      (SELECT COUNT(*) FROM customers WHERE normalized_phone='067778899' AND agency_id=?) cc2,
      (SELECT COUNT(*) FROM customers WHERE normalized_email='cross-race@example.com') cc5`,[agencyA,agencyA]);
    assert.deepEqual([Number(checks[0]!.cc1),Number(checks[0]!.cc2),Number(checks[0]!.cc5)],[1,1,2]);

    const opportunity=async(code:string,email:string|null,phone:string|null)=>{const[lead]=await setup.execute<any>('INSERT INTO leads(assigned_user_id,created_by,first_name,last_name,email,phone) VALUES(?,?,?,?,?,?)',[user.insertId,user.insertId,'Prospect',code,email,phone]);const[opp]=await setup.execute<any>('INSERT INTO opportunities(lead_id,assigned_user_id,title) VALUES(?,?,?)',[lead.insertId,user.insertId,`Opp ${code}`]);return{id:String(opp.insertId),lead_id:String(lead.insertId),customer_id:null,assigned_user_id:String(user.insertId),first_name:'Prospect',last_name:code,company_name:null,email,phone};};
    const convert=async(connection:Connection,row:RowDataPacket)=>{await connection.beginTransaction();try{const id=await ensureCustomer(connection as any,row,agencyA,request);await connection.commit();return id}catch(error){await connection.rollback();throw error}};
    const crm1=await opportunity('CRM1','crm-new@example.com','060000001');const crm1Id=await convert(c1,crm1 as any);
    const crm2=await opportunity('CRM2',' CRM-NEW@EXAMPLE.COM ',null);assert.equal(await convert(c1,crm2 as any),crm1Id);
    const crm3=await opportunity('CRM3',null,'060 000 001');assert.equal(await convert(c1,crm3 as any),crm1Id);
    const[emailA]=await setup.execute<any>('INSERT INTO customers(customer_code,agency_id,last_name,email) VALUES(?,?,?,?)',['CRM4A',agencyA,'A','crm-a@example.com']);
    const[phoneB]=await setup.execute<any>('INSERT INTO customers(customer_code,agency_id,last_name,phone) VALUES(?,?,?,?)',['CRM4B',agencyA,'B','068888888']);
    const crm4=await opportunity('CRM4','crm-a@example.com','06 888-88-88');await assert.rejects(convert(c1,crm4 as any),error=>(error as any).status===409);
    const[crm4Links]=await setup.query<RowDataPacket[]>('SELECT (SELECT customer_id FROM leads WHERE id=?) lead_customer,(SELECT customer_id FROM opportunities WHERE id=?) opportunity_customer',[crm4.lead_id,crm4.id]);assert.equal(crm4Links[0]!.lead_customer,null);assert.equal(crm4Links[0]!.opportunity_customer,null);assert.notEqual(String(emailA.insertId),String(phoneB.insertId));
    const[crm5Other]=await customer(setup,'CRM5OTHER',agencyB,'crm-other@example.com','065555555');const crm5=await opportunity('CRM5','crm-other@example.com','06 555-55-5');assert.notEqual(await convert(c1,crm5 as any),String(crm5Other.insertId));
    const crm6a=await opportunity('CRM6A','crm-race@example.com','066666666'),crm6b=await opportunity('CRM6B',' CRM-RACE@EXAMPLE.COM ','06 666-66-6');const crm6Ids=await Promise.all([convert(c1,crm6a as any),convert(c2,crm6b as any)]);assert.equal(new Set(crm6Ids).size,1);
    const[crm6Links]=await setup.query<RowDataPacket[]>('SELECT (SELECT customer_id FROM leads WHERE id=?) lead_a,(SELECT customer_id FROM leads WHERE id=?) lead_b,(SELECT customer_id FROM opportunities WHERE id=?) opp_a,(SELECT customer_id FROM opportunities WHERE id=?) opp_b',[crm6a.lead_id,crm6b.lead_id,crm6a.id,crm6b.id]);assert.deepEqual(new Set(Object.values(crm6Links[0]!).map(String)),new Set(crm6Ids));
  }finally{
    console.log=originalLog;
    await Promise.all(connections.map(connection=>connection.end().catch(()=>undefined)));
    await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await admin.end();
  }
});
