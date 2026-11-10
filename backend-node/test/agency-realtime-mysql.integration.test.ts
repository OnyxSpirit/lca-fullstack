import assert from'node:assert/strict';
import{createServer}from'node:http';
import{after,test}from'node:test';
import{randomUUID}from'node:crypto';
import WebSocket from'ws';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import{execute,pool,query}from'../src/config/database.js';
import{bootstrapDatabase}from'../src/scripts/database-bootstrap.js';
import{agencyRealtimeRooms,createRealtimeServer,refreshRealtimeSession}from'../src/realtime/socket.js';
import{selectActiveAgency}from'../src/modules/rbac/agency-rbac.service.js';
import{issueMysqlAccessToken}from'./helpers/mysql-auth-session-fixture.js';

const enabled=process.env.AGENCY_REALTIME_MYSQL_TEST==='1';if(enabled)after(()=>pool.end());
const waitMessage=(socket:WebSocket,predicate:(message:string)=>boolean)=>new Promise<string>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('WebSocket timeout')),5000),listener=(data:WebSocket.RawData)=>{const message=String(data);if(predicate(message)){clearTimeout(timer);socket.off('message',listener);resolve(message)}};socket.on('message',listener)});

test('PH2B SUPER_ADMIN reste limité aux salles de son agence active',()=>{
 const rooms=agencyRealtimeRooms({userId:'1',sessionId:'s',activeAgencyId:'10',contextVersion:1,isSuperAdmin:true,agencies:[],roles:[],permissions:new Map([['treasury.view','GLOBAL']])});
 assert.deepEqual([...rooms].sort(),['agency:10','session:s','treasury:agency:10','user:1']);
});

test('PH2B socket réelle suit uniquement agence active et révocation',{skip:!enabled,timeout:300000},async()=>{
 assert.match(process.env.DB_NAME??'',/isolated|test|phase2b/i);await bootstrapDatabase();const suffix=randomUUID().replaceAll('-','').slice(0,10),add=async(sql:string,p:unknown[]=[])=>String((await pool.execute<ResultSetHeader>(sql,p))[0].insertId);
 const concession=await add('INSERT INTO concessions(name,code)VALUES(?,?)',[`RT ${suffix}`,`RT${suffix}`]),a1=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'RT A',`RA${suffix}`]),a2=await add('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[concession,'RT B',`RB${suffix}`]);
 const[permission]=await query<RowDataPacket[]>("SELECT id FROM permissions WHERE code='treasury.view'");assert.ok(permission);const role=await add('INSERT INTO roles(name,code,is_system,is_active)VALUES(?,?,FALSE,TRUE)',[`RT ${suffix}`,`RT_${suffix}`]);await execute("INSERT INTO role_permissions(role_id,permission_id,scope)VALUES(?,?,'GLOBAL')",[role,permission.id]);
 const email=`rt-${suffix}@test.local`,user=await add("INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active)VALUES(?,'RT','User',?,'unused',TRUE)",[a1,email]),legacy=await add('INSERT INTO roles(name,code,is_system,is_active)VALUES(?,?,FALSE,TRUE)',[`Legacy RT ${suffix}`,`LRT_${suffix}`]);await execute('INSERT INTO user_roles(user_id,role_id)VALUES(?,?)',[user,legacy]);
 const ua1=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,TRUE,'ACTIVE')",[user,a1]),ua2=await add("INSERT INTO user_agencies(user_id,agency_id,is_primary,status)VALUES(?,?,FALSE,'ACTIVE')",[user,a2]);await execute('INSERT INTO user_agency_roles(user_agency_id,role_id)VALUES(?,?),(?,?)',[ua1,role,ua2,role]);
 const session=await issueMysqlAccessToken({userId:user,email,agencyId:a1}),http=createServer(),realtime=createRealtimeServer(http);await new Promise<void>(resolve=>http.listen(0,'127.0.0.1',resolve));const address=http.address();assert.ok(address&&typeof address==='object');
 const rejected=new WebSocket(`ws://127.0.0.1:${address.port}/socket.io/?EIO=4&transport=websocket`);await waitMessage(rejected,m=>m.startsWith('0'));rejected.send('40/realtime,{"token":"invalid"}');assert.match(await waitMessage(rejected,m=>m.startsWith('44/realtime')),/Jeton invalide/);rejected.close();
 const socket=new WebSocket(`ws://127.0.0.1:${address.port}/socket.io/?EIO=4&transport=websocket`);await waitMessage(socket,m=>m.startsWith('0'));socket.send(`40/realtime,${JSON.stringify({token:session.accessToken})}`);await waitMessage(socket,m=>m.startsWith('40/realtime'));
 let serverSocket=[...realtime.namespace.sockets.values()][0];assert.ok(serverSocket);assert.ok(serverSocket.rooms.has(`agency:${a1}`));assert.ok(serverSocket.rooms.has(`treasury:agency:${a1}`));assert.equal(serverSocket.rooms.has(`agency:${a2}`),false);assert.equal(serverSocket.rooms.has('global'),false);assert.equal(serverSocket.rooms.has('treasury:global'),false);
 await execute('DELETE FROM user_agency_roles WHERE user_agency_id=? AND role_id=?',[ua1,role]);await refreshRealtimeSession(session.sid);assert.equal(serverSocket.rooms.has(`treasury:agency:${a1}`),false);assert.ok(serverSocket.rooms.has(`agency:${a1}`));await execute('INSERT INTO user_agency_roles(user_agency_id,role_id)VALUES(?,?)',[ua1,role]);
 await selectActiveAgency(user,session.sid,a2);await refreshRealtimeSession(session.sid);serverSocket=[...realtime.namespace.sockets.values()][0];assert.ok(serverSocket.rooms.has(`agency:${a2}`));assert.equal(serverSocket.rooms.has(`agency:${a1}`),false);assert.equal(serverSocket.rooms.has(`treasury:agency:${a1}`),false);
 await execute("UPDATE user_agencies SET status='INACTIVE' WHERE id=?",[ua2]);await refreshRealtimeSession(session.sid);serverSocket=[...realtime.namespace.sockets.values()][0];assert.ok(serverSocket.rooms.has(`agency:${a1}`));assert.equal(serverSocket.rooms.has(`agency:${a2}`),false);
 await execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=?',[session.sid]);await refreshRealtimeSession(session.sid);assert.equal(realtime.namespace.sockets.size,0);
 socket.close();await new Promise<void>(resolve=>realtime.io.close(()=>resolve()));await new Promise<void>(resolve=>http.close(()=>resolve()));
});
