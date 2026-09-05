import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/realtime', cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.replace(/^Bearer /, '');
    try {
      const user = await this.jwt.verifyAsync<{ sub: string; agencyId: string | null }>(token, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET') });
      socket.data.user = user;
      await socket.join(`user:${user.sub}`);
      if (user.agencyId) await socket.join(`agency:${user.agencyId}`);
    } catch { socket.disconnect(true); }
  }

  emitAgency(agencyId: string, event: string, payload: unknown) { this.server?.to(`agency:${agencyId}`).emit(event, payload); }
  emitUser(userId: string, event: string, payload: unknown) { this.server?.to(`user:${userId}`).emit(event, payload); }
}
