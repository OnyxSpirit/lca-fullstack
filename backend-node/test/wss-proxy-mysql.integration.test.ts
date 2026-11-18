import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {after,test} from 'node:test';
import WebSocket from 'ws';
import type {RowDataPacket} from 'mysql2/promise';
import {execute,pool,query} from '../src/config/database.js';
import {issueMysqlAccessToken} from './helpers/mysql-auth-session-fixture.js';

const enabled=process.env.LCA_WSS_PROXY_TEST==='1';
if(enabled)after(async()=>pool.end());

function socketIoConnect(token:string){
  return new Promise<{accepted:boolean;message:string}>((resolve,reject)=>{
    const url=process.env.LCA_WSS_URL!;
    const caPath=process.env.LCA_WSS_CA_PATH;
    assert.ok(caPath,'LCA_WSS_CA_PATH est requis pour valider réellement la chaîne TLS');
    const target=new URL(url);
    const socket=new WebSocket(url,{rejectUnauthorized:true,ca:readFileSync(caPath),origin:`https://${target.host}`});
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
  const suffix=randomUUID().slice(0,8),email=`wss-${suffix}@test.local`,user=String((await execute('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[agency.id,'WSS','Proxy',email,'x'])).insertId);
  await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[user,role.id]);
  const{sid,accessToken:token}=await issueMysqlAccessToken({userId:user,email,agencyId:String(agency.id),twoFactorVerified:true});
  const accepted=await socketIoConnect(token);assert.equal(accepted.accepted,true,accepted.message);
  const reconnected=await socketIoConnect(token);assert.equal(reconnected.accepted,true,reconnected.message);
  const refused=await socketIoConnect('jeton-invalide');assert.equal(refused.accepted,false,refused.message);assert.match(refused.message,/Jeton invalide/);
  await pool.execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=?',[sid]);
  const revoked=await socketIoConnect(token);assert.equal(revoked.accepted,false,revoked.message);assert.match(revoked.message,/Jeton invalide/);
});
