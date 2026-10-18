import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {after,test} from 'node:test';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import type {RowDataPacket} from 'mysql2/promise';
import {execute,pool,query} from '../src/config/database.js';

const enabled=process.env.LCA_WSS_PROXY_TEST==='1';
if(enabled)after(async()=>pool.end());

function socketIoConnect(token:string){
  return new Promise<{accepted:boolean;message:string}>((resolve,reject)=>{
    const url=process.env.LCA_WSS_URL!;
    const socket=new WebSocket(url,{rejectUnauthorized:false,origin:'https://127.0.0.1:14443'});
    const timeout=setTimeout(()=>{socket.close();reject(new Error('WSS_TIMEOUT'))},5000);
    socket.on('error',reject);
    socket.on('message',raw=>{
      const message=raw.toString();
      if(message.startsWith('0'))socket.send(`40/realtime,${JSON.stringify({token})}`);
      else if(message==='2')socket.send('3');
      else if(message.startsWith('40/realtime,')){clearTimeout(timeout);socket.close();resolve({accepted:true,message})}
      else if(message.startsWith('44/realtime,')){clearTimeout(timeout);socket.close();resolve({accepted:false,message})}
    });
  });
}

test('WSS Nginx : upgrade accepté avec session persistée et refusé avec jeton invalide',{skip:!enabled},async()=>{
  const [agency]=await query<RowDataPacket[]>('SELECT id FROM agencies ORDER BY id LIMIT 1');assert.ok(agency);
  const [role]=await query<RowDataPacket[]>("SELECT id FROM roles WHERE code='SUPER_ADMIN' AND is_system=TRUE");assert.ok(role);
  const suffix=randomUUID().slice(0,8),user=String((await execute('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[agency.id,'WSS','Proxy',`wss-${suffix}@test.local`,'x'])).insertId),sid=randomUUID();
  await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[user,role.id]);
  await pool.execute('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,DATE_ADD(NOW(),INTERVAL 1 HOUR))',[sid,user,createHash('sha256').update(sid).digest('hex')]);
  const token=jwt.sign({sub:user,sid,email:`wss-${suffix}@test.local`,roles:[],agencyId:String(agency.id)},process.env.JWT_ACCESS_SECRET!,{expiresIn:'15m'});
  const accepted=await socketIoConnect(token);assert.equal(accepted.accepted,true,accepted.message);
  const refused=await socketIoConnect('jeton-invalide');assert.equal(refused.accepted,false,refused.message);assert.match(refused.message,/Jeton invalide/);
  await pool.execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=?',[sid]);
  const revoked=await socketIoConnect(token);assert.equal(revoked.accepted,false,revoked.message);assert.match(revoked.message,/Jeton invalide/);
});
