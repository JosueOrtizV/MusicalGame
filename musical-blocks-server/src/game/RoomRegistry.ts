import { Server as SocketServer } from 'socket.io';
import {
  ClientEvents,
  ServerEvents,
  RoomVisibility,
  RoomSummary,
} from '@shared/types';
import { GameRoom } from './GameRoom';

// ---------------------------------------------------------------------------
//  RoomRegistry
//  Central store for all active GameRoom instances.
// ---------------------------------------------------------------------------
export class RoomRegistry {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRoomMap: Map<string, string> = new Map();
  private readonly CLEANUP_DELAY_MS = 5_000;

  constructor(private readonly io: SocketServer<ClientEvents, ServerEvents>) {}

  // ---- Creation ------------------------------------------------------------

  create(
    hostSocketId: string,
    hostName: string,
    visibility: RoomVisibility,
  ): GameRoom {
    const onCloseCallback = (roomId: string) => {
      const room = this.rooms.get(roomId);
      if (room) {
        room.destroy();
        this.rooms.delete(roomId);
        console.log(`[Registry] Room ${roomId} closed via onClose callback.`);
      }
    };

    let room = new GameRoom(this.io, hostSocketId, hostName, visibility, onCloseCallback);
    while (this.rooms.has(room.id)) {
      room = new GameRoom(this.io, hostSocketId, hostName, visibility, onCloseCallback);
    }
    this.rooms.set(room.id, room);
    return room;
  }

  // ---- Joining -------------------------------------------------------------

  findAvailablePublicRoom(): GameRoom | null {
    for (const room of this.rooms.values()) {
      const summary = room.toSummary();
      if (
        summary.visibility === 'public' &&
        room.getStatus() === 'waiting' &&
        room.canJoin() &&
        room.playerCount() > 0
      ) {
        return room;
      }
    }
    return null;
  }

  joinPrivate(code: string): { room: GameRoom | null; error?: string } {
    const normalizedCode = code.trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) return { room: null, error: `Room "${normalizedCode}" not found.` };
    if (room.getStatus() !== 'waiting') return { room: null, error: 'That game has already started.' };
    if (!room.canJoin()) {
      const maxPlayers = room.toRoom().maxPlayers;
      return { room: null, error: `Room is full (max ${maxPlayers} players).` };
    }

    return { room };
  }

  // ---- Lookups -------------------------------------------------------------

  getByCode(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  setPlayerRoom(socketId: string, roomId: string): void {
    this.playerRoomMap.set(socketId, roomId);
  }

  removePlayerRoom(socketId: string): void {
    this.playerRoomMap.delete(socketId);
  }

  getRoomBySocketId(socketId: string): GameRoom | undefined {
    const roomId = this.playerRoomMap.get(socketId);
    if (roomId) {
      return this.rooms.get(roomId);
    }
    return undefined;
  }

  // ---- Public list (REST) --------------------------------------------------

  getPublicList(): RoomSummary[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.toSummary().visibility === 'public')
      .map((r) => r.toSummary());
  }

  // ---- Cleanup -------------------------------------------------------------

  scheduleCleanup(roomId: string): void {
    setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (room?.isEmpty()) {
        room.destroy();
        this.rooms.delete(roomId);
        console.log(`[Registry] Room ${roomId} cleaned up.`);
      }
    }, this.CLEANUP_DELAY_MS);
  }

  removeIfEmpty(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room?.isEmpty()) {
      room.destroy();
      this.rooms.delete(roomId);
    }
  }
}
