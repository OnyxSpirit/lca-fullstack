import assert from 'node:assert/strict';
import test,{after,before} from 'node:test';
import mysql,{type PoolConnection,type RowDataPacket} from 'mysql2/promise';
import {assertTestDriveStartAvailable} from '../src/modules/showroom/showroom-test-drive.js';
import {pool as appPool} from '../src/config/database.js';
import {createMysqlActor,ensureMysqlHttpAdministrator} from './helpers/mysql-auth-session-fixture.js';

const enabled=process.env.CORR_ERP_02D_MYSQL==='1';
const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT??3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:8});
let agencyId='',vehicle1='',vehicle2='',advisor1='',advisor2='',visit1='',visit2='',visit3='';

if(enabled)before(async()=>{
  const admin=await ensureMysqlHttpAdministrator([]);agencyId=admin.agencyId;advisor1=admin.userId;
  advisor2=(await createMysqlActor({label:'Showroom D',agencyId,permissions:[]})).userId;
  const insert=async(sql:string,p:unknown[])=>String((await pool.execute<any>(sql,p))[0].insertId);
  vehicle1=await insert("INSERT INTO vehicles(agency_id,identity_brand,identity_model,vin,status) VALUES(?,'B31','Concurrence D',?,'available')",[agencyId,`B31D1${Date.now()}`]);
  vehicle2=await insert("INSERT INTO vehicles(agency_id,identity_brand,identity_model,vin,status) VALUES(?,'B31','Concurrence D',?,'available')",[agencyId,`B31D2${Date.now()}`]);
  visit1=await insert("INSERT INTO showroom_visits(visitor_name,agency_id,assigned_user_id,status) VALUES('Visite D1',?,?,'in_progress')",[agencyId,advisor1]);
  visit2=await insert("INSERT INTO showroom_visits(visitor_name,agency_id,assigned_user_id,status) VALUES('Visite D2',?,?,'in_progress')",[agencyId,advisor2]);
  visit3=await insert("INSERT INTO showroom_visits(visitor_name,agency_id,assigned_user_id,status) VALUES('Visite D3',?,?,'in_progress')",[agencyId,advisor1]);
});
if(enabled)after(async()=>{await pool.end();await appPool.end()});

async function reserve(vehicleId:string,advisorId:string,visitId:string){
  for(let attempt=1;;attempt++){
    const connection=await pool.getConnection();
    try{
      await connection.beginTransaction();
      await assertTestDriveStartAvailable(connection,{vehicleId,advisorId,agencyId,visitId});
      await connection.execute("INSERT INTO showroom_test_drives(visit_id,vehicle_id,agency_id,advisor_id,driver_name,mileage_out,status) VALUES(?,?,?,?,'Conducteur B31',0,'in_progress')",[visitId,vehicleId,agencyId,advisorId]);
      await connection.commit();return'created' as const;
    }catch(error:any){await connection.rollback();if(error?.status===409)return'conflict' as const;if(error?.code!=='ER_LOCK_DEADLOCK'||attempt>=3)throw error}finally{connection.release()}
  }
}

async function cancel(id:string){
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const[drives]=await connection.execute<RowDataPacket[]>('SELECT vehicle_id,advisor_id FROM showroom_test_drives WHERE id=?',[id]),drive=drives[0]!;
    await connection.execute('SELECT id FROM vehicles WHERE id=? FOR UPDATE',[drive.vehicle_id]);
    await connection.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[drive.advisor_id]);
    await connection.execute("UPDATE showroom_test_drives SET status='cancelled' WHERE id=? AND status='in_progress'",[id]);
    await connection.commit();
  }catch(error){await connection.rollback();throw error}finally{connection.release()}
}

async function clear(){await pool.execute('DELETE FROM showroom_test_drives')}

test('CORR-ERP-02D MySQL 8.4 sérialise les ressources des essais actifs',{skip:!enabled},async()=>{
  await clear();
  assert.deepEqual((await Promise.all([reserve(vehicle1,advisor1,visit1),reserve(vehicle1,advisor2,visit2)])).sort(),['conflict','created'],'même véhicule');
  await clear();
  assert.deepEqual((await Promise.all([reserve(vehicle1,advisor1,visit1),reserve(vehicle2,advisor1,visit2)])).sort(),['conflict','created'],'même commercial');
  await clear();
  assert.deepEqual((await Promise.all([reserve(vehicle1,advisor1,visit1),reserve(vehicle2,advisor2,visit2)])).sort(),['created','created'],'ressources indépendantes');
  await clear();
  await pool.execute("INSERT INTO showroom_test_drives(visit_id,vehicle_id,agency_id,advisor_id,driver_name,mileage_out,status) VALUES(?,?,?,?,'Conducteur B31',0,'in_progress')",[visit1,vehicle1,agencyId,advisor1]);
  const[rows]=await pool.query<RowDataPacket[]>('SELECT id FROM showroom_test_drives LIMIT 1'),id=String(rows[0]!.id);
  const outcomes=await Promise.allSettled([cancel(id),reserve(vehicle1,advisor1,visit3)]);
  assert.equal(outcomes.every(result=>result.status==='fulfilled'),true);
  const[active]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) total FROM showroom_test_drives WHERE status='in_progress' AND (vehicle_id=? OR advisor_id=?)",[vehicle1,advisor1]);
  assert.ok(Number(active[0]!.total)<=1,'annulation et nouvelle réservation laissent au plus un essai actif');
  await clear();
});
