import type{Server as HttpServer}from'node:http';
import jwt from'jsonwebtoken';
import{Server}from'socket.io';
import{env}from'../config/env.js';
import type{AuthUser}from'../types/index.js';
import{resolveAgencyRbacContext,type AgencyRbacContext}from'../modules/rbac/agency-rbac.service.js';
import{assertSessionCurrent}from'../modules/auth/two-factor.service.js';

let realtimeNamespace:ReturnType<Server['of']>|null=null;
const managedRoom=(room:string)=>room==='global'||room.startsWith('agency:')||room.startsWith('treasury:')||room.startsWith('hr:');
type RoomSocket={rooms:Set<string>;data:any;join:(room:string)=>Promise<void>|void;leave:(room:string)=>Promise<void>|void;disconnect:(close?:boolean)=>unknown};

export async function authorizeRealtimeToken(token:unknown){if(typeof token!=='string'||!token)throw new Error('Jeton invalide');const claims=jwt.verify(token,env.jwt.accessSecret,{algorithms:['HS256']})as AuthUser;if(!claims.sid)throw new Error('Jeton invalide');await assertSessionCurrent(claims.sub,claims.sid);const context=await resolveAgencyRbacContext(claims.sub,claims.sid);if(!context.activeAgencyId)throw new Error('Aucune agence active');return{claims,context}}

export function agencyRealtimeRooms(context:AgencyRbacContext){const rooms=new Set<string>([`user:${context.userId}`,`session:${context.sessionId}`]);if(!context.activeAgencyId)return rooms;rooms.add(`agency:${context.activeAgencyId}`);for(const[domain,permission]of[['treasury','treasury.view'],['hr','hr.view']]as const)if(context.permissions.has(permission))rooms.add(`${domain}:agency:${context.activeAgencyId}`);return rooms}

async function synchronizeSocket(socket:RoomSocket,context:AgencyRbacContext){for(const room of socket.rooms)if(managedRoom(room))await socket.leave(room);for(const room of agencyRealtimeRooms(context))await socket.join(room);socket.data.agencyContext=context;socket.data.userId=context.userId;socket.data.sessionId=context.sessionId}
async function revalidateSocket(socket:RoomSocket){const userId=String(socket.data.userId??''),sessionId=String(socket.data.sessionId??'');if(!userId||!sessionId)throw new Error('Session temps réel invalide');const context=await resolveAgencyRbacContext(userId,sessionId);if(!context.activeAgencyId)throw new Error('Aucune agence active');await synchronizeSocket(socket,context);return context}

export function emitToUser(userId:string,event:string,payload:unknown){realtimeNamespace?.to(`user:${userId}`).emit(event,payload);if(event==='rbac:updated')disconnectUser(userId)}
export async function emitToUserAgencyContext(userId:string,agencyId:string|null,event:string,payload:unknown){if(!realtimeNamespace)return;const sockets=await realtimeNamespace.in(`user:${userId}`).fetchSockets();for(const socket of sockets){const context=socket.data.agencyContext as AgencyRbacContext|undefined;if(agencyId===null||context?.activeAgencyId===agencyId)socket.emit(event,payload)}}
export function disconnectUser(userId:string){realtimeNamespace?.in(`user:${userId}`).disconnectSockets(true)}
export function disconnectSession(sessionId:string){realtimeNamespace?.in(`session:${sessionId}`).disconnectSockets(true)}
export async function refreshRealtimeSession(sessionId:string){if(!realtimeNamespace)return;const sockets=await realtimeNamespace.in(`session:${sessionId}`).fetchSockets();for(const socket of sockets)try{await revalidateSocket(socket)}catch{socket.disconnect(true)}}

export function emitToAgency(agencyId:string,event:string,payload:unknown){realtimeNamespace?.to(`agency:${agencyId}`).emit(event,payload)}
// Compatibilité des émetteurs historiques : aucune socket multi-agences ne rejoint
// désormais la room globale, les événements métier restent donc isolés par agence.
export function emitToAgencyAndGlobals(agencyId:string,event:string,payload:unknown){realtimeNamespace?.to(`agency:${agencyId}`).to('global').emit(event,payload)}
export function emitToAgenciesAndGlobals(agencyIds:string[],event:string,payload:unknown){let target=realtimeNamespace?.to('global');for(const agencyId of new Set(agencyIds))target=target?.to(`agency:${agencyId}`);target?.emit(event,payload)}
export function emitToDomainAgenciesAndGlobals(domain:'treasury'|'hr',agencyIds:string[],event:string,payload:unknown){let target=realtimeNamespace?.to(`${domain}:global`);for(const agencyId of new Set(agencyIds))target=target?.to(`${domain}:agency:${agencyId}`);target?.emit(event,payload)}

export function createRealtimeServer(server:HttpServer){const io=new Server(server,{path:'/socket.io',cors:{origin:env.frontendUrl,credentials:true}}),namespace=io.of('/realtime');realtimeNamespace=namespace;namespace.use(async(socket,next)=>{try{const token=socket.handshake.auth?.token??socket.handshake.headers.authorization?.replace(/^Bearer /,'');const{claims,context}=await authorizeRealtimeToken(token);socket.data.user={...claims,agencyId:context.activeAgencyId};socket.data.userId=claims.sub;socket.data.sessionId=claims.sid;socket.data.pendingAgencyContext=context;next()}catch{next(new Error('Jeton invalide'))}});namespace.on('connection',async socket=>{try{await synchronizeSocket(socket,socket.data.pendingAgencyContext as AgencyRbacContext);delete socket.data.pendingAgencyContext}catch{socket.disconnect(true);return}socket.on('agency:refresh',async(_payload,ack?:Function)=>{try{const context=await revalidateSocket(socket);ack?.({ok:true,activeAgencyId:context.activeAgencyId,contextVersion:context.contextVersion})}catch{socket.disconnect(true)}})});io.on('close',()=>{realtimeNamespace=null});return{io,namespace}}
