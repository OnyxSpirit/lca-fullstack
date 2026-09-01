import { io, Socket } from 'socket.io-client';
const BACKEND_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/api\/?$/, '');
let socket: Socket | null = null;
export function connectRealtime(token: string) {
  socket?.disconnect();
  socket = io(`${BACKEND_URL}/realtime`, { auth: { token }, transports: ['websocket'] });
  return socket;
}
export function disconnectRealtime() { socket?.disconnect(); socket = null; }
export function getRealtimeSocket() { return socket; }
