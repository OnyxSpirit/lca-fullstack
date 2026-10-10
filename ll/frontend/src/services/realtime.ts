import type { Socket } from 'socket.io-client';
const apiUrl = import.meta.env?.VITE_API_URL || '/api';
const BACKEND_URL = new URL(apiUrl, window.location.origin).origin;
let socket: Socket | null = null;
let connectionGeneration = 0;
export async function connectRealtime(token: string) {
  const generation = ++connectionGeneration;
  socket?.disconnect();
  socket = null;
  const { io } = await import('socket.io-client');
  if (generation !== connectionGeneration) return null;
  const nextSocket = io(`${BACKEND_URL}/realtime`, { auth: { token }, transports: ['websocket'], autoConnect: false });
  if (generation !== connectionGeneration) { nextSocket.disconnect(); return null; }
  socket = nextSocket;
  nextSocket.connect();
  return nextSocket;
}
export function disconnectRealtime(expectedSocket?: Socket | null) {
  if (expectedSocket && socket !== expectedSocket) { expectedSocket.disconnect(); return; }
  connectionGeneration += 1;
  socket?.disconnect();
  socket = null;
}
export function getRealtimeSocket() { return socket; }
export function refreshRealtimeToken(token:string){if(!socket)return;socket.auth={token};if(!socket.connected)socket.connect()}
