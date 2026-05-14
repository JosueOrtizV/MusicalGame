'use client';

import { io, Socket } from 'socket.io-client';
import { ServerEvents, ClientEvents } from '@/src/shared/types';
import { SERVER_URL } from './constants';

// ---------------------------------------------------------------------------
//  Typed socket singleton — lazy initialized on first use
// ---------------------------------------------------------------------------
type AppSocket = Socket<ServerEvents, ClientEvents>;

let _socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!_socket) {
    // Determine connection URL (swap localhost for current hostname if on mobile/LAN)
    let url = SERVER_URL;
    if (typeof window !== 'undefined' && url.includes('localhost')) {
      url = url.replace('localhost', window.location.hostname);
    }

    _socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: false, // manual connect via useSocket hook
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return _socket;
}

// Clock offset: serverTime - clientTime (set after ping/pong)
let _clockOffset = 0;

export function getClockOffset(): number {
  return _clockOffset;
}

export function setClockOffset(offset: number): void {
  _clockOffset = offset;
}

/** Returns server-synchronized timestamp */
export function serverNow(): number {
  return Date.now() + _clockOffset;
}
