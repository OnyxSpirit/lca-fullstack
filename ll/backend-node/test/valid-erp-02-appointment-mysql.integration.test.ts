import assert from 'node:assert/strict';
import test from 'node:test';
import mysql,{type PoolConnection,type RowDataPacket} from 'mysql2/promise';

const enabled=process.env.VALID_ERP_02_MYSQL==='1';
const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT??3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:4});

async function reserve(userId:string,start:Date,duration:number){
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    await connection.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[userId]);
    const end=new Date(start.getTime()+duration*60000);
    const[conflicts]=await connection.execute<RowDataPacket[]>(`SELECT id FROM follow_ups WHERE assigned_user_id=? AND status='pending' AND scheduled_at<? AND DATE_ADD(scheduled_at,INTERVAL COALESCE(duration_minutes,30) MINUTE)>? FOR UPDATE`,[userId,end,start]);
    if(conflicts.length){await connection.rollback();return'conflict' as const}
    await connection.execute("INSERT INTO follow_ups(assigned_user_id,scheduled_at,duration_minutes,status,notes) VALUES(?,?,?,'pending','VALID-ERP-02')",[userId,start,duration]);
    await connection.commit();return'created' as const;
  }catch(error){await connection.rollback();throw error}finally{connection.release()}
}

test('VALID-ERP-02 MySQL 8.4 sérialise deux créations identiques et accepte les bornes adjacentes',{skip:!enabled},async()=>{
  const[users]=await pool.query<RowDataPacket[]>('SELECT id FROM users ORDER BY id LIMIT 1');
  const userId=String(users[0]!.id),start=new Date('2040-01-15T10:00:00Z');
  await pool.execute("DELETE FROM follow_ups WHERE notes='VALID-ERP-02'");
  const concurrent=await Promise.all([reserve(userId,start,30),reserve(userId,start,30)]);
  assert.deepEqual(concurrent.sort(),['conflict','created']);
  assert.equal(await reserve(userId,new Date('2040-01-15T10:30:00Z'),30),'created');
  const[rows]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) total FROM follow_ups WHERE notes='VALID-ERP-02'");
  assert.equal(Number(rows[0]!.total),2);
  await pool.execute("DELETE FROM follow_ups WHERE notes='VALID-ERP-02'");
  await pool.end();
});
