/// <reference types="vite/client" />
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta as { env?: { VITE_SERVER_URL?: string } }).env?.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
