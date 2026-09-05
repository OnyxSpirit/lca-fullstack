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

export function emitToAgency(agencyId: string, event: string, payload: unknown) {
  realtimeNamespace?.to(`agency:${agencyId}`).emit(event, payload);
}
export function emitToAgencyAndGlobals(agencyId:string,event:string,payload:unknown){realtimeNamespace?.to(`agency:${agencyId}`).to('global').emit(event,payload)}
export function emitToAgenciesAndGlobals(agencyIds:string[],event:string,payload:unknown){let target=realtimeNamespace?.to('global');for(const agencyId of new Set(agencyIds))target=target?.to(`agency:${agencyId}`);target?.emit(event,payload)}

export function createRealtimeServer(server: HttpServer) {
  const io = new Server(server, { path: '/socket.io', cors: { origin: env.frontendUrl, credentials: true } });
  const namespace = io.of('/realtime');
  realtimeNamespace = namespace;
  namespace.use(async(socket,next)=>{try{const token=socket.handshake.auth?.token??socket.handshake.headers.authorization?.replace(/^Bearer /,'');const user=jwt.verify(token,env.jwt.accessSecret) as AuthUser;const[active]=await query<RowDataPacket[]>('SELECT id FROM users WHERE id=? AND is_active=TRUE',[user.sub]);if(!active)throw new Error();socket.data.user=user;next();}catch{next(new Error('Jeton invalide'));}});
  namespace.on('connection',socket=>{const user=socket.data.user as AuthUser;void socket.join(`user:${user.sub}`);if(user.agencyId)void socket.join(`agency:${user.agencyId}`);if(user.roles.some(role=>['SUPER_ADMIN','DIRECTOR'].includes(role)))void socket.join('global');});
  io.on('close',()=>{realtimeNamespace=null;});
  return { io, namespace };
}
