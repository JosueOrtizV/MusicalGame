'use client';

import { io, Socket } from 'socket.io-client';
import { ServerEvents, ClientEvents } from '@/src/shared/types';
import { SERVER_URL } from './constants';
import { useGameStore } from '../stores/gameStore';

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

    // Auto-inject HMAC Session Token into client emits for state-altering events
    const originalEmit = _socket.emit;
    _socket.emit = function (eventName: string, ...args: unknown[]) {
      const stateAlteringEvents = [
        'player:ready',
        'player:update_cosmetics',
        'host:start_game',
        'host:back_to_lobby',
        'player:return_lobby',
        'host:kick_player',
        'host:update_settings',
        'player:move',
        'chat:send',
        'host:cancel_start'
      ];
      
      let finalArgs = [...args];
      if (stateAlteringEvents.includes(eventName)) {
        const { sessionToken } = useGameStore.getState();
        if (sessionToken) {
          if (finalArgs.length === 0) {
            finalArgs = [{ token: sessionToken }];
          } else if (typeof finalArgs[0] === 'object' && finalArgs[0] !== null) {
            finalArgs[0] = { ...(finalArgs[0] as Record<string, unknown>), token: sessionToken };
          }
        }
      }
      
      return originalEmit.apply(_socket, [eventName, ...finalArgs] as unknown as Parameters<typeof originalEmit>);
    } as unknown as typeof _socket.emit;
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
