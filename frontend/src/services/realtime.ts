import { io, Socket } from 'socket.io-client';
const apiUrl = import.meta.env.VITE_API_URL || '/api';
const BACKEND_URL = new URL(apiUrl, window.location.origin).origin;
let socket: Socket | null = null;
export function connectRealtime(token: string) {
  socket?.disconnect();
  socket = io(`${BACKEND_URL}/realtime`, { auth: { token }, transports: ['websocket'] });
  return socket;
}
export function disconnectRealtime() { socket?.disconnect(); socket = null; }
export function getRealtimeSocket() { return socket; }
export function refreshRealtimeToken(token:string){if(!socket)return;socket.auth={token};if(!socket.connected)socket.connect()}
