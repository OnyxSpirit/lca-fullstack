import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import express from 'express';
import request from 'supertest';
import type {RowDataPacket} from 'mysql2/promise';
import {pool} from '../src/config/database.js';
import {errorHandler} from '../src/middleware/error-handler.js';
import {showroomRouter} from '../src/modules/showroom/showroom.routes.js';

const enabled=process.env.SHOWROOM_INTEGRITY_MYSQL_TEST==='1';
const app=express();
app.use(express.json());
app.use((req,_res,next)=>{req.user={sub:'1',email:'integrity@test.local',agencyId:'1',roles:[]};req.rbac={permissions:new Map([['showroom.view','AGENCY'],['showroom.visitor.create','AGENCY'],['showroom.visitor.update','AGENCY']]),roles:[]};next()});
app.use('/api',showroomRouter);
app.use(errorHandler);

async function ddl(sql:string){await pool.query(sql)}

before(async()=>{
  if(!enabled)return;
  for(const table of ['showroom_test_drives','opportunities','showroom_visits','vehicles','versions','models','brands','customers','leads','users','agencies'])await ddl(`DROP TABLE IF EXISTS ${table}`);
  await ddl('CREATE TABLE agencies(id BIGINT PRIMARY KEY,is_active BOOLEAN NOT NULL,concession_id BIGINT NOT NULL,name VARCHAR(100),code VARCHAR(30)) ENGINE=InnoDB');
  await ddl('CREATE TABLE users(id BIGINT PRIMARY KEY,first_name VARCHAR(100),last_name VARCHAR(100),agency_id BIGINT,is_active BOOLEAN DEFAULT TRUE) ENGINE=InnoDB');
  await ddl('CREATE TABLE customers(id BIGINT PRIMARY KEY,customer_code VARCHAR(30)) ENGINE=InnoDB');
  await ddl('CREATE TABLE leads(id BIGINT AUTO_INCREMENT PRIMARY KEY,customer_id BIGINT NULL,assigned_user_id BIGINT NULL,created_by BIGINT NULL,source VARCHAR(100),status VARCHAR(30),priority VARCHAR(30),first_name VARCHAR(100),last_name VARCHAR(100),phone VARCHAR(50),notes TEXT) ENGINE=InnoDB');
  await ddl('CREATE TABLE opportunities(id BIGINT AUTO_INCREMENT PRIMARY KEY,lead_id BIGINT,customer_id BIGINT NULL,assigned_user_id BIGINT NULL,title VARCHAR(200),stage VARCHAR(30),probability INT,notes TEXT) ENGINE=InnoDB');
  await ddl('CREATE TABLE brands(id BIGINT PRIMARY KEY,name VARCHAR(100)) ENGINE=InnoDB');
  await ddl('CREATE TABLE models(id BIGINT PRIMARY KEY,brand_id BIGINT,name VARCHAR(100)) ENGINE=InnoDB');
  await ddl('CREATE TABLE versions(id BIGINT PRIMARY KEY,model_id BIGINT,name VARCHAR(100)) ENGINE=InnoDB');
  await ddl('CREATE TABLE vehicles(id BIGINT PRIMARY KEY,version_id BIGINT,vin VARCHAR(100),registration_number VARCHAR(100)) ENGINE=InnoDB');
  await ddl("CREATE TABLE showroom_visits(id BIGINT AUTO_INCREMENT PRIMARY KEY,customer_id BIGINT NULL,lead_id BIGINT NULL,origin ENUM('showroom','crm') NOT NULL DEFAULT 'showroom',visitor_name VARCHAR(200),phone VARCHAR(50),reason VARCHAR(255),preferred_model VARCHAR(200),vehicle_id BIGINT NULL,greeted_by BIGINT,assigned_user_id BIGINT NULL,agency_id BIGINT,queue_number INT,status ENUM('waiting','assigned','in_progress','completed','cancelled'),outcome VARCHAR(30) DEFAULT 'pending',arrival_at DATETIME DEFAULT CURRENT_TIMESTAMP,assigned_at DATETIME NULL,completed_at DATETIME NULL,cancellation_reason VARCHAR(255) NULL,notes TEXT NULL,INDEX idx_showroom_agency_status_arrival(agency_id,status,arrival_at)) ENGINE=InnoDB");
  await ddl("CREATE TABLE showroom_test_drives(id BIGINT AUTO_INCREMENT PRIMARY KEY,visit_id BIGINT,customer_id BIGINT NULL,lead_id BIGINT NULL,vehicle_id BIGINT,agency_id BIGINT,advisor_id BIGINT,driver_name VARCHAR(200),driver_phone VARCHAR(50),license_number VARCHAR(100),mileage_out INT,status VARCHAR(30),started_at DATETIME,created_by BIGINT) ENGINE=InnoDB");
  await pool.execute("INSERT INTO agencies(id,is_active,concession_id,name,code) VALUES(1,TRUE,1,'Agence test','A1')");
  await pool.execute("INSERT INTO users(id,first_name,last_name,agency_id,is_active) VALUES(1,'Test','Actor',1,TRUE)");
});

after(async()=>{if(enabled)await pool.end()});

test('DUP-INT-06/07 deux créations réelles donnent 201+409 puis CREATE_ANYWAY reste autorisé',{skip:!enabled},async()=>{
  const payload={visitorName:'Course Doublon',phone:'+242 06 123 45 67',reason:'Accueil',agencyId:'1'};
  const responses=await Promise.all([request(app).post('/api/showroom').send(payload),request(app).post('/api/showroom').send({...payload,phone:'06 123-45-67'})]);
  assert.deepEqual(responses.map(response=>response.status).sort(),[201,409]);
  assert.equal(responses.find(response=>response.status===409)?.body.details.code,'SHOWROOM_DUPLICATE_CONFIRMATION_REQUIRED');
  const[count]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) total FROM showroom_visits WHERE REGEXP_REPLACE(phone,'[^0-9]','') IN('061234567','242061234567')");
  assert.equal(Number(count[0]?.total),1);
  assert.equal((await request(app).post('/api/showroom').send({...payload,duplicateConfirmation:'CREATE_ANYWAY'})).status,201);
  const[confirmed]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) total FROM showroom_visits WHERE REGEXP_REPLACE(phone,'[^0-9]','') IN('061234567','242061234567')");
  assert.equal(Number(confirmed[0]?.total),2);
});

test('CONVERT-INT-10 deux conversions réelles ne créent qu’un lead et une opportunité',{skip:!enabled},async()=>{
  const[result]=await pool.execute<any>("INSERT INTO showroom_visits(origin,visitor_name,phone,reason,greeted_by,agency_id,queue_number,status,completed_at) VALUES('showroom','Conversion Course','060000001','Achat',1,1,50,'completed',NOW())"),id=String(result.insertId);
  const responses=await Promise.all([request(app).post(`/api/showroom/${id}/convert-to-lead`).send({title:'Projet'}),request(app).post(`/api/showroom/${id}/convert-to-lead`).send({title:'Projet'})]);
  assert.deepEqual(responses.map(response=>response.status).sort(),[200,201]);
  assert.equal(responses.find(response=>response.status===200)?.body.existing,true);
  const[visits]=await pool.query<RowDataPacket[]>('SELECT lead_id FROM showroom_visits WHERE id=?',[id]),visit=visits[0]!;
  const[leads]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) total FROM leads WHERE notes=?",[`Visite showroom #${id}`]);
  const[opportunities]=await pool.query<RowDataPacket[]>('SELECT COUNT(*) total FROM opportunities WHERE lead_id=?',[visit.lead_id]);
  assert.ok(visit.lead_id);assert.equal(Number(leads[0]?.total),1);assert.equal(Number(opportunities[0]?.total),1);
});

test('CONVERT-ROLLBACK annule le lead si l’opportunité échoue',{skip:!enabled},async()=>{
  await pool.execute('DELETE FROM opportunities');
  await ddl('ALTER TABLE opportunities MODIFY title VARCHAR(1) NOT NULL');
  const[result]=await pool.execute<any>("INSERT INTO showroom_visits(origin,visitor_name,phone,reason,greeted_by,agency_id,queue_number,status,completed_at) VALUES('showroom','Rollback Conversion','060000002','Achat',1,1,51,'completed',NOW())"),id=String(result.insertId);
  assert.equal((await request(app).post(`/api/showroom/${id}/convert-to-lead`).send({title:'Projet trop long'})).status,500);
  const[visits]=await pool.query<RowDataPacket[]>('SELECT lead_id FROM showroom_visits WHERE id=?',[id]);
  const[leads]=await pool.query<RowDataPacket[]>('SELECT COUNT(*) total FROM leads WHERE notes=?',[`Visite showroom #${id}`]);
  assert.equal(visits[0]?.lead_id,null);assert.equal(Number(leads[0]?.total),0);
  await ddl('ALTER TABLE opportunities MODIFY title VARCHAR(200) NOT NULL');
});

test('MYSQL-INTEGRITY expose version et isolation',{skip:!enabled},async()=>{
  const[rows]=await pool.query<RowDataPacket[]>('SELECT VERSION() version,@@transaction_isolation isolation_level'),row=rows[0]!;
  assert.match(String(row.version),/^8\.4\./);assert.equal(row.isolation_level,'REPEATABLE-READ');
});
