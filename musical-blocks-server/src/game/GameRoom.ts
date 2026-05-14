import { Server as SocketServer } from 'socket.io';
import {
  Room,
  RoomStatus,
  RoomVisibility,
  RoomSummary,
  GameState,
  BlockColor,
  GamePhase,
  Direction,
  MAX_PLAYERS,
  ClientEvents,
  ServerEvents,
} from '@shared/types';
import { GridManager } from './GridManager';
import { PlayerManager } from './PlayerManager';
import { GameLoop } from './GameLoop';

// ---------------------------------------------------------------------------
//  GameRoom
//  Self-contained unit: owns grid, players, game loop.
//  Communicates with clients exclusively via io.to(this.id).emit(…)
// ---------------------------------------------------------------------------
export class GameRoom {
  readonly id: string;
  readonly visibility: RoomVisibility;

  private status: RoomStatus = 'waiting';
  private hostId: string;

  private grid = new GridManager();
  private players = new PlayerManager();
  private loop: GameLoop;

  // Pending winner color set during ANNOUNCING, consumed during ELIMINATING
  private pendingWinner: BlockColor | null = null;

  // Current authoritative game state fields
  private currentPhase: GamePhase = 'LOBBY';
  private round = 0;
  private timeLeft = 0;
  private winnerColor: BlockColor | null = null;
  private winnerId: string | null = null;

  constructor(
    private readonly io: SocketServer<ClientEvents, ServerEvents>,
    hostSocketId: string,
    hostName: string,
    visibility: RoomVisibility,
  ) {
    this.id = GameRoom.generateCode();
    this.visibility = visibility;
    this.hostId = hostSocketId;

    this.players.add(hostSocketId, hostName, true);

    this.loop = new GameLoop(this.grid, this.players, {
      onRoundStart: (round: number, duration: number) => {
        this.round = round;
        this.currentPhase = 'DANCING';
        this.winnerColor = null;
        this.io.to(this.id).emit('game:round_start', {
          round,
          duration,
          blocks: this.grid.getSnapshot(),
        });
      },
      onAnnounce: (winnerColor: BlockColor, colorCounts: Record<BlockColor, number>) => {
        this.currentPhase = 'ANNOUNCING';
        this.winnerColor = winnerColor;
        this.pendingWinner = winnerColor;
        this.io.to(this.id).emit('game:announce', { winnerColor, colorCounts });
      },
      onEliminate: (eliminatedBlocks: Array<{ row: number; col: number }>, deadIds: string[]) => {
        this.currentPhase = 'ELIMINATING';
        this.io.to(this.id).emit('game:eliminate', { eliminatedBlocks });

        const allPlayers = this.players.getAll();
        for (const deadId of deadIds) {
          const p = allPlayers.find((pl) => pl.id === deadId);
          if (p) {
            this.io.to(this.id).emit('game:player_died', {
              playerId: deadId,
              playerName: p.name,
            });
          }
        }
        this.io.to(this.id).emit('game:state', this.buildState());
      },
      onGameOver: (winnerId: string | null, winnerName: string | null) => {
        this.currentPhase = 'GAME_OVER';
        this.status = 'finished';
        this.winnerId = winnerId;
        
        for (const player of this.players.getAll()) {
          player.hasReturnedToLobby = false;
        }
        
        this.io.to(this.id).emit('game:over', { winnerId, winnerName });
        
        console.log(`[Game] Room ${this.id} ended. Winner: ${winnerName || 'None'} (Round ${this.round})`);

        // Auto-reset room to waiting after 15 seconds
        this.gameOverTimeout = setTimeout(() => {
          this.resetRoom();
        }, 15000);
      },
      onTimeTick: (timeLeft: number) => {
        this.timeLeft = timeLeft;
        this.io.to(this.id).emit('game:state', this.buildState());
      },
    });
  }

  // ---- Room management -----------------------------------------------------

  canJoin(): boolean {
    return this.status === 'waiting' && this.players.count() < MAX_PLAYERS;
  }

  addPlayer(socketId: string, name: string): boolean {
    if (!this.canJoin()) return false;

    // If room is empty (e.g. everyone disconnected), this player becomes host
    const isFirstPlayer = this.players.count() === 0;
    if (isFirstPlayer) {
      this.hostId = socketId;
    }

    this.players.add(socketId, name, isFirstPlayer);
    this.broadcastRoomUpdate();
    return true;
  }

  removePlayer(socketId: string): void {
    const player = this.players.get(socketId);
    if (player) {
      console.log(`[Room] "${player.name}" left room ${this.id}`);
    }
    this.players.remove(socketId);

    if (socketId === this.hostId) {
      const remaining = this.players.getAll();
      if (remaining.length > 0) {
        remaining[0].isHost = true;
        this.hostId = remaining[0].id;
        console.log(`[Room] Host transferred to "${remaining[0].name}" in room ${this.id}`);
      }
    }

    if (this.loop.isRunning() && this.players.getAlive().length <= 1) {
      this.loop.stop();
      const winner = this.players.getWinner();
      this.status = 'finished';
      this.currentPhase = 'GAME_OVER';
      this.winnerId = winner?.id ?? null;

      this.io.to(this.id).emit('game:over', {
        winnerId: winner?.id ?? null,
        winnerName: winner?.name ?? null,
      });
    }

    if (this.players.count() > 0) {
      this.broadcastRoomUpdate();
    }
  }

  setPlayerReturnedToLobby(socketId: string): void {
    const player = this.players.get(socketId);
    if (player) {
      player.hasReturnedToLobby = true;
      this.broadcastRoomUpdate();
    }
  }

  kickPlayer(playerId: string, reason: string): void {
    const targetSocket = this.io.sockets.sockets.get(playerId);
    const player = this.players.get(playerId);
    if (targetSocket && player) {
      console.log(`[Room] "${player.name}" was kicked from room ${this.id} (${reason})`);
      targetSocket.emit('room:kicked', { reason });
      this.removePlayer(playerId);
    }
  }

  setPlayerReady(socketId: string, ready: boolean): void {
    this.players.setReady(socketId, ready);
    this.broadcastRoomUpdate();
  }

  startGame(requesterId: string): { ok: boolean; error?: string } {
    if (requesterId !== this.hostId) {
      return { ok: false, error: 'Only the host can start the game.' };
    }
    if (this.players.count() < 2) {
      return { ok: false, error: 'Need at least 2 players to start.' };
    }
    if (this.loop.isRunning()) {
      return { ok: false, error: 'Game already in progress.' };
    }
    this.status = 'playing';
    this.loop.start();
    return { ok: true };
  }

  handlePlayerMove(sid: string, direction: Direction, timestamp: number) {
    if (this.currentPhase !== 'DANCING' && this.currentPhase !== 'ANNOUNCING') return;

    const player = this.players.get(sid);
    if (!player || !player.isAlive) return;
    
    // Authoritative validation
    if (!this.players.validateMove(sid, direction, timestamp, this.grid)) return;

    this.players.applyMove(sid, direction);
    this.io.to(this.id).emit('game:state', this.buildState());
  }

  // ---- State ---------------------------------------------------------------

  buildState(): GameState {
    return {
      phase: this.currentPhase,
      round: this.round,
      timeLeft: this.timeLeft,
      winnerColor: this.winnerColor,
      blocks: this.grid.getSnapshot(),
      players: this.players.getAll(),
      winnerId: this.winnerId,
    };
  }

  toSummary(): RoomSummary {
    return {
      id: this.id,
      visibility: this.visibility,
      status: this.status,
      playerCount: this.players.count(),
      maxPlayers: MAX_PLAYERS,
      hostName: this.players.get(this.hostId)?.name ?? 'Unknown',
    };
  }

  toRoom(): Room {
    return {
      id: this.id,
      visibility: this.visibility,
      status: this.status,
      players: this.players.getAll(),
      maxPlayers: MAX_PLAYERS,
      hostId: this.hostId,
      gameState: this.status === 'playing' ? this.buildState() : null,
    };
  }

  getStatus(): RoomStatus {
    return this.status;
  }

  playerCount(): number {
    return this.players.count();
  }

  isEmpty(): boolean {
    return this.players.count() === 0;
  }

  destroy(): void {
    this.loop.stop();
  }

  private gameOverTimeout: NodeJS.Timeout | null = null;

  // ---- Public broadcast (called externally too) ----------------------------

  /** Just emit the current room state */
  broadcastRoomUpdate(): void {
    this.io.to(this.id).emit('room:updated', { room: this.toRoom() });
  }

  /** Reset a finished room to 'waiting' state and broadcast to remaining players. */
  resetRoom(): void {
    if (this.gameOverTimeout) {
      clearTimeout(this.gameOverTimeout);
      this.gameOverTimeout = null;
    }
    
    if (this.status === 'finished') {
      this.status = 'waiting';
      this.currentPhase = 'LOBBY';
      this.winnerId = null;
      this.winnerColor = null;
      this.round = 0;
      this.players.resetAlive();
    }
    this.broadcastRoomUpdate();
  }

  // ---- Private -------------------------------------------------------------

  private static generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
