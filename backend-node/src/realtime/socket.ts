import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import type { AuthUser } from '../types/index.js';

let realtimeNamespace: ReturnType<Server['of']> | null = null;

export function emitToUser(userId: string, event: string, payload: unknown) {
  realtimeNamespace?.to(`user:${userId}`).emit(event, payload);
}

export function emitToAgency(agencyId: string, event: string, payload: unknown) {
  realtimeNamespace?.to(`agency:${agencyId}`).emit(event, payload);
}

export function createRealtimeServer(server: HttpServer) {
  const io = new Server(server, { path: '/socket.io', cors: { origin: env.frontendUrl, credentials: true } });
  const namespace = io.of('/realtime');
  realtimeNamespace = namespace;
  namespace.use((socket,next)=>{try{const token=socket.handshake.auth?.token??socket.handshake.headers.authorization?.replace(/^Bearer /,'');socket.data.user=jwt.verify(token,env.jwt.accessSecret) as AuthUser;next();}catch{next(new Error('Jeton invalide'));}});
  namespace.on('connection',socket=>{const user=socket.data.user as AuthUser;void socket.join(`user:${user.sub}`);if(user.agencyId)void socket.join(`agency:${user.agencyId}`);});
  io.on('close',()=>{realtimeNamespace=null;});
  return { io, namespace };
}
