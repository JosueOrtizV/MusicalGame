import { Socket, Server as SocketServer } from 'socket.io';
import {
  ClientEvents,
  ServerEvents,
  Room,
  RoomVisibility,
  Direction,
  RoomSettings,
} from '@shared/types';
import { RoomRegistry } from '../game/RoomRegistry';
import { generateSessionToken, verifySessionToken } from '../utils/crypto';
import { securityLogger } from '../utils/logger';

type TypedSocket = Socket<ClientEvents, ServerEvents>;
type TypedIO     = SocketServer<ClientEvents, ServerEvents>;

// ---------------------------------------------------------------------------
//  Name validation
// ---------------------------------------------------------------------------
function validateName(name: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof name !== 'string') return { ok: false, error: 'Name must be a string.' };
  const trimmed = name.trim().replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ _\-]/g, '');
  if (trimmed.length < 2) return { ok: false, error: 'Name must be at least 2 characters.' };
  if (trimmed.length > 16) return { ok: false, error: 'Name must be 16 characters or fewer.' };
  return { ok: true, name: trimmed };
}

// ---------------------------------------------------------------------------
//  registerHandlers — wires all Socket.io events for one socket
// ---------------------------------------------------------------------------
export function registerHandlers(
  io: TypedIO,
  socket: TypedSocket,
  registry: RoomRegistry,
): void {
  const sid = socket.id;
  console.log(`[Socket] Connected: ${sid}`);

  // HMAC Session Token Verification Interceptor
  socket.use((packet, next) => {
    const [eventName, payload] = packet;
    
    // Exempt setup, discovery, and leaving events
    if (
      eventName === 'ping' ||
      eventName === 'room:get_list' ||
      eventName === 'room:create' ||
      eventName === 'room:join_public' ||
      eventName === 'room:join_private' ||
      eventName === 'room:leave'
    ) {
      return next();
    }
    
    // Verify HMAC session token
    const token = payload?.token;
    if (!token || !verifySessionToken(token, sid)) {
      securityLogger.warn(
        { event: eventName, socketId: sid, ip: socket.handshake.address },
        'HMAC Session Token validation failed: event blocked (Hijack prevention)'
      );
      return next(new Error('Session validation failed. Hijacking prevented.'));
    }
    
    next();
  });

  // Clock sync
  socket.on('ping', ({ clientTime }: { clientTime: number }) => {
    socket.emit('pong', { serverTime: Date.now(), clientTime });
  });

  // Room list
  socket.on('room:get_list', () => {
    socket.emit('room:list', registry.getPublicList());
  });

  // ---- Create room ---------------------------------------------------------
  socket.on(
    'room:create',
    (
      { playerName, visibility }: { playerName: string; visibility: RoomVisibility },
      cb: (room: Room) => void,
    ) => {
      const nameResult = validateName(playerName);
      if (!nameResult.ok) {
        socket.emit('room:error', { message: nameResult.error });
        return;
      }

      leaveCurrentRoom(socket, registry);
      const room = registry.create(sid, nameResult.name, visibility);
      socket.join(room.id);
      const token = generateSessionToken(sid, nameResult.name);
      const roomData = room.toRoom();
      roomData.sessionToken = token;
      cb(roomData);
      console.log(`[Room] Created ${room.id} (${visibility}) by "${nameResult.name}"`);
    },
  );

  // ---- Join public (auto-match) -------------------------------------------
  socket.on(
    'room:join_public',
    (
      { playerName }: { playerName: string },
      cb: (room: Room | null, error?: string) => void,
    ) => {
      const nameResult = validateName(playerName);
      if (!nameResult.ok) {
        cb(null, nameResult.error);
        return;
      }

      leaveCurrentRoom(socket, registry);

      let target = registry.findAvailablePublicRoom();
      if (!target) {
        target = registry.create(sid, nameResult.name, 'public');
        socket.join(target.id);
        const token = generateSessionToken(sid, nameResult.name);
        const roomData = target.toRoom();
        roomData.sessionToken = token;
        cb(roomData);
        console.log(`[Room] Auto-created public room ${target.id} for "${nameResult.name}"`);
        return;
      }

      const joined = target.addPlayer(sid, nameResult.name);
      if (!joined) {
        cb(null, 'Room became full before you could join. Try again.');
        return;
      }

      socket.join(target.id);
      const token = generateSessionToken(sid, nameResult.name);
      const roomData = target.toRoom();
      roomData.sessionToken = token;
      cb(roomData);
      console.log(`[Room] "${nameResult.name}" joined public room ${target.id}`);
    },
  );

  // ---- Join private by code ------------------------------------------------
  socket.on(
    'room:join_private',
    (
      { playerName, code }: { playerName: string; code: string },
      cb: (room: Room | null, error?: string) => void,
    ) => {
      const nameResult = validateName(playerName);
      if (!nameResult.ok) {
        cb(null, nameResult.error);
        return;
      }

      const { room, error } = registry.joinPrivate(code);
      if (!room || error) {
        cb(null, error ?? 'Could not join room.');
        return;
      }

      leaveCurrentRoom(socket, registry);
      const joined = room.addPlayer(sid, nameResult.name);
      if (!joined) {
        cb(null, 'Room became full before you could join.');
        return;
      }

      socket.join(room.id);
      const token = generateSessionToken(sid, nameResult.name);
      const roomData = room.toRoom();
      roomData.sessionToken = token;
      cb(roomData);
      console.log(`[Room] "${nameResult.name}" joined private room ${room.id}`);
    },
  );

  // ---- Leave ---------------------------------------------------------------
  socket.on('room:leave', () => {
    leaveCurrentRoom(socket, registry);
  });

  // ---- Ready toggle --------------------------------------------------------
  socket.on('player:ready', ({ ready }: { ready: boolean; token?: string }) => {
    const room = registry.getRoomBySocketId(sid);
    if (!room) return;
    room.setPlayerReady(sid, ready);
  });

  // ---- Host starts game ----------------------------------------------------
  socket.on('host:start_game', ({ token }: { token?: string } = {}) => {
    const room = registry.getRoomBySocketId(sid);
    if (!room) {
      socket.emit('room:error', { message: 'You are not in a room.' });
      return;
    }
    const result = room.startGame(sid);
    if (!result.ok) {
      socket.emit('room:error', { message: result.error ?? 'Could not start game.' });
    } else {
      console.log(`[Game] Room ${room.id} started by ${sid}. Config: ${room.getFormattedConfig()}`);
    }
  });

  // ---- Host goes back to lobby ---------------------------------------------
  socket.on('host:back_to_lobby', ({ token }: { token?: string } = {}) => {
    const room = registry.getRoomBySocketId(sid);
    if (!room) return;
    
    // Only host can do this
    if (room.toRoom().hostId !== sid) return;
    
    room.resetRoom();
  });

  // ---- Player returns to lobby from results --------------------------------
  socket.on('player:return_lobby', ({ token }: { token?: string } = {}) => {
    const room = registry.getRoomBySocketId(sid);
    if (!room) return;
    
    // In GameRoom, add a helper to set hasReturnedToLobby or do it via player manager
    const p = room.toRoom().players.find(p => p.id === sid);
    if (p) {
      // Actually we need to set it on the server's authoritative player object
      // Let's add a setReturnedToLobby method to GameRoom or just access it directly via room's player manager if possible.
      // Wait, room.players is private. I'll add setReturnedToLobby in GameRoom next.
      room.setPlayerReturnedToLobby(sid);
    }
  });

  // ---- Host kicks player ----------------------------------------------------
  socket.on('host:kick_player', ({ playerId }: { playerId: string; token?: string }) => {
    const room = registry.getRoomBySocketId(sid);
    if (!room) return;
    
    // Only host can do this
    if (room.toRoom().hostId !== sid) return;
    // Cannot kick yourself
    if (playerId === sid) return;

    room.kickPlayer(playerId, 'You have been kicked by the host');
  });

  // ---- Host updates settings -----------------------------------------------
  socket.on('host:update_settings', ({ settings }: { settings: RoomSettings; token?: string }) => {
    const room = registry.getRoomBySocketId(sid);
    if (!room) return;

    // Only host can do this
    if (room.toRoom().hostId !== sid) return;

    room.updateSettings(settings);
  });

  // ---- Player movement -----------------------------------------------------
  socket.on('player:move', ({ direction, timestamp }: { direction: Direction; timestamp: number; token?: string }) => {
    const room = registry.getRoomBySocketId(sid);
    if (!room) return;
    room.handlePlayerMove(sid, direction, timestamp);
  });

  // ---- Chat ----------------------------------------------------------------
  socket.on('chat:send', ({ text }: { text: string; token?: string }) => {
    const room = registry.getRoomBySocketId(sid);
    if (!room) return;
    room.handleChat(sid, text);
  });

  // ---- Disconnect ----------------------------------------------------------
  socket.on('disconnect', (reason: string) => {
    console.log(`[Socket] Disconnected: ${sid} (${reason})`);
    leaveCurrentRoom(socket, registry);
  });
}

// ---------------------------------------------------------------------------
//  Helper
// ---------------------------------------------------------------------------
function leaveCurrentRoom(socket: TypedSocket, registry: RoomRegistry): void {
  const room = registry.getRoomBySocketId(socket.id);
  if (!room) return;
  const roomId = room.id;
  room.removePlayer(socket.id);
  socket.leave(roomId);
  if (room.isEmpty()) {
    registry.scheduleCleanup(roomId);
  } else {
    // Notify remaining players of the updated room state WITHOUT resetting finished status
    room.broadcastRoomUpdate();
  }
}
