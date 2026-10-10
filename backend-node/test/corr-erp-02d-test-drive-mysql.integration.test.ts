import assert from 'node:assert/strict';
import test from 'node:test';
import mysql,{type PoolConnection,type RowDataPacket} from 'mysql2/promise';
import {assertTestDriveStartAvailable} from '../src/modules/showroom/showroom-test-drive.js';

const enabled=process.env.CORR_ERP_02D_MYSQL==='1';
const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT??3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:8});

async function reserve(vehicleId:string,advisorId:string,visitId:string){
  for(let attempt=1;;attempt++){
    const connection=await pool.getConnection();
    try{
      await connection.beginTransaction();
      await assertTestDriveStartAvailable(connection,{vehicleId,advisorId,agencyId:'1',visitId});
      await connection.execute("INSERT INTO showroom_test_drives(visit_id,vehicle_id,advisor_id,status) VALUES(?,?,?,'in_progress')",[visitId,vehicleId,advisorId]);
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
  assert.deepEqual((await Promise.all([reserve('1','1','1'),reserve('1','2','2')])).sort(),['conflict','created'],'même véhicule');
  await clear();
  assert.deepEqual((await Promise.all([reserve('1','1','1'),reserve('2','1','2')])).sort(),['conflict','created'],'même commercial');
  await clear();
  assert.deepEqual((await Promise.all([reserve('1','1','1'),reserve('2','2','2')])).sort(),['created','created'],'ressources indépendantes');
  await clear();
  await pool.execute("INSERT INTO showroom_test_drives(visit_id,vehicle_id,advisor_id,status) VALUES(1,1,1,'in_progress')");
  const[rows]=await pool.query<RowDataPacket[]>('SELECT id FROM showroom_test_drives LIMIT 1'),id=String(rows[0]!.id);
  const outcomes=await Promise.allSettled([cancel(id),reserve('1','1','3')]);
  assert.equal(outcomes.every(result=>result.status==='fulfilled'),true);
  const[active]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) total FROM showroom_test_drives WHERE status='in_progress' AND (vehicle_id=1 OR advisor_id=1)");
  assert.ok(Number(active[0]!.total)<=1,'annulation et nouvelle réservation laissent au plus un essai actif');
  await clear();await pool.end();
});
