import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
let realtimeNamespace = null;
export function emitToUser(userId, event, payload) {
    realtimeNamespace?.to(`user:${userId}`).emit(event, payload);
}
export function emitToAgency(agencyId, event, payload) {
    realtimeNamespace?.to(`agency:${agencyId}`).emit(event, payload);
}
export function emitToAgencyAndGlobals(agencyId, event, payload) { realtimeNamespace?.to(`agency:${agencyId}`).to('global').emit(event, payload); }
export function emitToAgenciesAndGlobals(agencyIds, event, payload) { let target = realtimeNamespace?.to('global'); for (const agencyId of new Set(agencyIds))
    target = target?.to(`agency:${agencyId}`); target?.emit(event, payload); }
export function createRealtimeServer(server) {
    const io = new Server(server, { path: '/socket.io', cors: { origin: env.frontendUrl, credentials: true } });
    const namespace = io.of('/realtime');
    realtimeNamespace = namespace;
    namespace.use(async (socket, next) => { try {
        const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.replace(/^Bearer /, '');
        const user = jwt.verify(token, env.jwt.accessSecret);
        const [active] = await query('SELECT id FROM users WHERE id=? AND is_active=TRUE', [user.sub]);
        if (!active)
            throw new Error();
        socket.data.user = user;
        next();
    }
    catch {
        next(new Error('Jeton invalide'));
    } });
    namespace.on('connection', socket => { const user = socket.data.user; void socket.join(`user:${user.sub}`); if (user.agencyId)
        void socket.join(`agency:${user.agencyId}`); if (user.roles.some(role => ['SUPER_ADMIN', 'DIRECTOR'].includes(role)))
        void socket.join('global'); });
    io.on('close', () => { realtimeNamespace = null; });
    return { io, namespace };
}
