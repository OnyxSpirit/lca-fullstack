import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import type { AuthUser } from '../types/index.js';
import { query } from '../config/database.js';
import type { RowDataPacket } from 'mysql2/promise';

let realtimeNamespace: ReturnType<Server['of']> | null = null;

export function emitToUser(userId: string, event: string, payload: unknown) {
  realtimeNamespace?.to(`user:${userId}`).emit(event, payload);
}
export function disconnectUser(userId:string){realtimeNamespace?.in(`user:${userId}`).disconnectSockets(true)}

export function emitToAgency(agencyId: string, event: string, payload: unknown) {
  realtimeNamespace?.to(`agency:${agencyId}`).emit(event, payload);
}
export function emitToAgencyAndGlobals(agencyId:string,event:string,payload:unknown){realtimeNamespace?.to(`agency:${agencyId}`).to('global').emit(event,payload)}
export function emitToAgenciesAndGlobals(agencyIds:string[],event:string,payload:unknown){let target=realtimeNamespace?.to('global');for(const agencyId of new Set(agencyIds))target=target?.to(`agency:${agencyId}`);target?.emit(event,payload)}

export function createRealtimeServer(server: HttpServer) {
  const io = new Server(server, { path: '/socket.io', cors: { origin: env.frontendUrl, credentials: true } });
  const namespace = io.of('/realtime');
  realtimeNamespace = namespace;
  namespace.use(async(socket,next)=>{try{const token=socket.handshake.auth?.token??socket.handshake.headers.authorization?.replace(/^Bearer /,'');const claims=jwt.verify(token,env.jwt.accessSecret) as AuthUser;const[active]=await query<RowDataPacket[]>(`SELECT u.id,u.agency_id,EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE) is_system_super_admin FROM users u WHERE u.id=? AND u.is_active=TRUE`,[claims.sub]);if(!active)throw new Error();socket.data.user={...claims,agencyId:String(active.agency_id)};socket.data.isSystemSuperAdmin=Boolean(active.is_system_super_admin);next();}catch{next(new Error('Jeton invalide'));}});
  namespace.on('connection',socket=>{const user=socket.data.user as AuthUser;void socket.join(`user:${user.sub}`);if(user.agencyId)void socket.join(`agency:${user.agencyId}`);if(socket.data.isSystemSuperAdmin)void socket.join('global');});
  io.on('close',()=>{realtimeNamespace=null;});
  return { io, namespace };
}
