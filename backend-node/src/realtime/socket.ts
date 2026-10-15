import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import type { AuthUser } from '../types/index.js';
import { query } from '../config/database.js';
import type { RowDataPacket } from 'mysql2/promise';
import { resolveRbacContext } from '../modules/rbac/rbac.service.js';

let realtimeNamespace: ReturnType<Server['of']> | null = null;

export function emitToUser(userId: string, event: string, payload: unknown) {
  realtimeNamespace?.to(`user:${userId}`).emit(event, payload);
  if(event==='rbac:updated')disconnectUser(userId);
}
export function disconnectUser(userId:string){realtimeNamespace?.in(`user:${userId}`).disconnectSockets(true)}

export function emitToAgency(agencyId: string, event: string, payload: unknown) {
  realtimeNamespace?.to(`agency:${agencyId}`).emit(event, payload);
}
export function emitToAgencyAndGlobals(agencyId:string,event:string,payload:unknown){realtimeNamespace?.to(`agency:${agencyId}`).to('global').emit(event,payload)}
export function emitToAgenciesAndGlobals(agencyIds:string[],event:string,payload:unknown){let target=realtimeNamespace?.to('global');for(const agencyId of new Set(agencyIds))target=target?.to(`agency:${agencyId}`);target?.emit(event,payload)}
export function emitToDomainAgenciesAndGlobals(domain:'treasury'|'hr',agencyIds:string[],event:string,payload:unknown){let target=realtimeNamespace?.to(`${domain}:global`);for(const agencyId of new Set(agencyIds))target=target?.to(`${domain}:agency:${agencyId}`);target?.emit(event,payload)}

export function createRealtimeServer(server: HttpServer) {
  const io = new Server(server, { path: '/socket.io', cors: { origin: env.frontendUrl, credentials: true } });
  const namespace = io.of('/realtime');
  realtimeNamespace = namespace;
  namespace.use(async(socket,next)=>{try{const token=socket.handshake.auth?.token??socket.handshake.headers.authorization?.replace(/^Bearer /,'');const claims=jwt.verify(token,env.jwt.accessSecret,{algorithms:['HS256']}) as AuthUser;if(!claims.sid)throw new Error();const[active]=await query<RowDataPacket[]>(`SELECT u.id,u.agency_id,a.concession_id FROM users u JOIN refresh_tokens rt ON rt.id=? AND rt.user_id=u.id AND rt.revoked_at IS NULL AND rt.expires_at>NOW() LEFT JOIN agencies a ON a.id=u.agency_id WHERE u.id=? AND u.is_active=TRUE`,[claims.sid,claims.sub]);if(!active)throw new Error();const context=await resolveRbacContext(claims.sub);socket.data.user={...claims,agencyId:active.agency_id==null?null:String(active.agency_id)};socket.data.concessionId=active.concession_id==null?null:String(active.concession_id);socket.data.permissions=context.permissions;socket.data.receivesGlobalSettings=context.permissions.get('settings.view')==='GLOBAL'||context.permissions.get('settings.update')==='GLOBAL';next();}catch{next(new Error('Jeton invalide'));}});
  namespace.on('connection',async socket=>{const user=socket.data.user as AuthUser;void socket.join(`user:${user.sub}`);if(user.agencyId)void socket.join(`agency:${user.agencyId}`);if(socket.data.receivesGlobalSettings)void socket.join('global');const permissions=socket.data.permissions as Map<string,string>;for(const [domain,permission] of [['treasury','treasury.view'],['hr','hr.view']] as const){const granted=permissions.get(permission);if(granted==='GLOBAL')void socket.join(`${domain}:global`);else if(granted==='AGENCY'&&user.agencyId)void socket.join(`${domain}:agency:${user.agencyId}`);else if(granted==='CONCESSION'&&socket.data.concessionId){const agencies=await query<RowDataPacket[]>('SELECT id FROM agencies WHERE concession_id=?',[socket.data.concessionId]);for(const agency of agencies)void socket.join(`${domain}:agency:${agency.id}`);}}});
  io.on('close',()=>{realtimeNamespace=null;});
  return { io, namespace };
}
