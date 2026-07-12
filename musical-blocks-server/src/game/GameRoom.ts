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
  RoomSettings,
  ChatMessage,
  PlayerCosmetics,
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
  private startingRound = 1;
  private timeLeft = 0;
  private winnerColor: BlockColor | null = null;
  private winnerId: string | null = null;

  private settings: RoomSettings = { maxColors: 6, gameSpeed: 'NORMAL', maxLives: 3, suddenDeathMode: 'NORMAL', enableCollisions: false, maxPlayers: 8 };

  // Dynamic audio synchronization indices
  private lobbySongIndex = 0;
  private gameSongIndices: number[] = [];
  private victorySongIndex = 0;

  // Timers for lobby logic
  private afkInterval: NodeJS.Timeout | null = null;
  private countdownTimeout: NodeJS.Timeout | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;
  private autoStartSilentTimeout: NodeJS.Timeout | null = null;
  private countdownSeconds: number = 0;
  private countdownType: 'auto' | 'manual' | null = null;

  // Safety & Lobby Maintenance properties
  private cancellationCount = 0;
  private lobbyOpenTime: number = Date.now();

  constructor(
    private readonly io: SocketServer<ClientEvents, ServerEvents>,
    hostSocketId: string,
    hostName: string,
    visibility: RoomVisibility,
    private readonly onClose?: (roomId: string) => void,
  ) {
    this.id = GameRoom.generateCode();
    this.visibility = visibility;
    this.hostId = hostSocketId;

    this.randomizeSongs();
    this.players.add(hostSocketId, hostName, true);

    const checkIntervalTime = process.env.NODE_ENV === 'test' ? 1000 : 10000;
    this.afkInterval = setInterval(() => {
      this.checkAFK();
    }, checkIntervalTime);

    this.loop = new GameLoop(this.grid, this.players, {
      onStateUpdate: () => {
        this.currentPhase = this.loop.getPhase();
        this.io.to(this.id).emit('game:state', this.buildState());
      },
      onRoundStart: (round: number, duration: number) => {
        this.round = round;
        this.currentPhase = 'DANCING';
        this.winnerColor = null;
        this.broadcastSystemMessage(`Round ${round} started!`);
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
            this.broadcastSystemMessage(`${p.name} fell into the void!`);
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
        
        if (winnerName) {
          this.broadcastSystemMessage(`${winnerName} won the game!`);
        } else {
          this.broadcastSystemMessage(`Game Over! Everyone died.`);
        }
        
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
    const limit = this.settings.maxPlayers || 8;
    return this.status === 'waiting' && this.players.count() < limit;
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
        remaining[0].isReady = true;
        this.hostId = remaining[0].id;
        this.cancellationCount = 0; // Reset cancellation count for the new host
        console.log(`[Room] Host transferred to "${remaining[0].name}" in room ${this.id}`);
      }
    }

    if (this.loop.isRunning() && this.players.getAlive().length <= 1) {
      this.loop.stop();
      const winner = this.players.getWinner();
      this.status = 'finished';
      this.currentPhase = 'GAME_OVER';
      this.winnerId = winner?.id ?? null;
      const winnerName = winner?.name ?? null;

      for (const player of this.players.getAll()) {
        player.hasReturnedToLobby = false;
      }

      this.io.to(this.id).emit('game:over', {
        winnerId: this.winnerId,
        winnerName,
      });

      if (winnerName) {
        this.broadcastSystemMessage(`${winnerName} won the game!`);
      } else {
        this.broadcastSystemMessage(`Game Over! Everyone died.`);
      }

      console.log(`[Game] Room ${this.id} ended prematurely (player disconnected). Winner: ${winnerName || 'None'} (Round ${this.round})`);

      if (this.gameOverTimeout) {
        clearTimeout(this.gameOverTimeout);
      }

      // Auto-reset room to waiting after 15 seconds
      this.gameOverTimeout = setTimeout(() => {
        this.resetRoom();
      }, 15000);
    }

    if (this.players.count() > 0) {
      if (this.players.count() < 2) {
        this.cancelCountdown();
      } else {
        this.checkAutoStart();
      }
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
    if (player) {
      console.log(`[Room] "${player.name}" was kicked from room ${this.id} (${reason})`);
      
      let msg = '';
      if (reason === 'afkKickReason') {
        msg = `${player.name} has been kicked for inactivity`;
      } else if (reason === 'lobbyTimeoutReason') {
        msg = `${player.name} was disconnected (lobby timeout)`;
      } else {
        msg = `${player.name} has been kicked by the host`;
      }
      
      this.broadcastSystemMessage(msg);
      if (targetSocket) {
        targetSocket.emit('room:kicked', { reason });
        targetSocket.leave(this.id);
      }
      this.removePlayer(playerId);
    }
  }

  setPlayerReady(socketId: string, ready: boolean): void {
    this.players.setReady(socketId, ready);
    this.players.updateActivity(socketId);
    this.broadcastRoomUpdate();
    this.checkAutoStart();
  }

  setPlayerCosmetics(socketId: string, cosmetics: PlayerCosmetics): void {
    const player = this.players.get(socketId);
    if (player) {
      this.players.updateActivity(socketId);
      // Get colors currently used by other players in the room
      const otherPlayers = this.players.getAll().filter((p) => p.id !== socketId);
      const takenColors = new Set(otherPlayers.map((p) => (p.color || '').toLowerCase()));

      const sanitizedCosmetics = { ...cosmetics };

      if (cosmetics.primaryColor) {
        const requestedColor = cosmetics.primaryColor;
        if (takenColors.has(requestedColor.toLowerCase())) {
          // Color is already taken by another player! Revert to the player's current valid color.
          sanitizedCosmetics.primaryColor = player.color;
        } else {
          // Color is free! Apply it.
          player.color = requestedColor;
        }
      } else {
        // If primaryColor is not provided, make sure it is populated with the assigned color
        sanitizedCosmetics.primaryColor = player.color;
      }

      player.cosmetics = sanitizedCosmetics;
      this.broadcastRoomUpdate();
    }
  }

  updateSettings(settings: RoomSettings): void {
    if (this.status !== 'waiting') return;
    const maxColors = Math.max(2, Math.min(10, settings.maxColors));
    const speed = ['CHILL', 'NORMAL', 'TURBO'].includes(settings.gameSpeed) ? settings.gameSpeed : 'NORMAL';
    const maxLives = [1, 2, 3, 4, 5].includes(settings.maxLives as number) ? settings.maxLives : 3;
    const sdMode = ['NORMAL', 'OFF', 'CHAOS'].includes(settings.suddenDeathMode as string) ? settings.suddenDeathMode : 'NORMAL';
    
    const currentCount = this.players.count();
    const maxPlayers = Math.max(currentCount, Math.max(2, Math.min(12, settings.maxPlayers || 8)));
    
    this.settings = { 
      maxColors, 
      gameSpeed: speed, 
      isBlindMode: !!settings.isBlindMode, 
      maxLives, 
      suddenDeathMode: sdMode, 
      enableCollisions: !!settings.enableCollisions,
      maxPlayers
    };
    this.grid.setMaxColors(maxColors);
    this.grid.setSuddenDeathMode(sdMode as any);
    this.loop.setSpeed(speed as any);
    this.loop.setBlindMode(!!settings.isBlindMode);
    this.broadcastRoomUpdate();
  }

  updateHostActivity(socketId: string): void {
    if (socketId === this.hostId) {
      this.players.updateActivity(socketId);
    }
  }

  startGame(requesterId: string): { ok: boolean; error?: string } {
    if (requesterId !== this.hostId) {
      return { ok: false, error: 'Only the host can start the game.' };
    }
    const { meetsThreshold } = this.players.getReadyStatus();
    if (!meetsThreshold) {
      return { ok: false, error: 'Need more ready players to start.' };
    }
    if (this.loop.isRunning()) {
      return { ok: false, error: 'Game already in progress.' };
    }
    if (this.countdownType === 'manual') {
      return { ok: false, error: 'Countdown already in progress.' };
    }
    
    this.startCountdown(5, false);
    return { ok: true };
  }

  handlePlayerMove(sid: string, direction: Direction, timestamp: number) {
    if (this.currentPhase !== 'DANCING' && this.currentPhase !== 'ANNOUNCING') return;

    const player = this.players.get(sid);
    if (!player || !player.isAlive) return;
    
    // Authoritative validation
    if (!this.players.validateMove(sid, direction, timestamp, this.grid, this.settings.enableCollisions)) return;

    this.players.applyMove(sid, direction);
    this.io.to(this.id).emit('game:state', this.buildState());
  }

  handleChat(sid: string, text: string) {
    const player = this.players.get(sid);
    if (!player) return;
    this.players.updateActivity(sid);

    // Parse chat commands for testing (Host only, in lobby/waiting status, only in development)
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && this.status === 'waiting' && sid === this.hostId && text.startsWith('/round ')) {
      const parts = text.split(' ');
      const targetRound = parseInt(parts[1], 10);
      if (!isNaN(targetRound) && targetRound >= 1 && targetRound <= 200) {
        this.startingRound = targetRound;
        this.broadcastSystemMessage(`Ronda inicial establecida en ${targetRound} por el anfitrión. / Starting round set to ${targetRound} by host.`);
        return;
      }
    }

    // Validate: if game is playing, only dead players can chat
    if (this.status === 'playing' && player.isAlive) {
      return;
    }

    const message: ChatMessage = {
      id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      senderId: player.id,
      senderName: player.name,
      text: text.trim().slice(0, 150), // limit length
      timestamp: Date.now(),
    };

    this.io.to(this.id).emit('chat:broadcast', message);
  }

  broadcastSystemMessage(text: string) {
    const message: ChatMessage = {
      id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      senderId: 'system',
      senderName: 'System',
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    this.io.to(this.id).emit('chat:broadcast', message);
  }

  // ---- State ---------------------------------------------------------------

  buildState(): GameState {
    return {
      phase: this.currentPhase,
      round: this.round,
      timeLeft: this.timeLeft,
      isBlackout: this.loop.getIsBlackout(),
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
      maxPlayers: this.settings.maxPlayers || 8,
      hostName: this.players.get(this.hostId)?.name ?? 'Unknown',
    };
  }

  toRoom(): Room {
    return {
      id: this.id,
      visibility: this.visibility,
      status: this.status,
      players: this.players.getAll(),
      maxPlayers: this.settings.maxPlayers || 8,
      hostId: this.hostId,
      gameState: this.status === 'playing' ? this.buildState() : null,
      settings: this.settings,
      lobbySongIndex: this.lobbySongIndex,
      gameSongIndices: this.gameSongIndices,
      victorySongIndex: this.victorySongIndex,
      cancellationCount: this.cancellationCount,
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
    if (this.afkInterval) clearInterval(this.afkInterval);
    this.cancelCountdown();
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
      this.startingRound = 1;
      this.players.resetAlive();
      this.randomizeSongs(); // Randomize tracks for the next match!
      this.cancellationCount = 0;
      this.lobbyOpenTime = Date.now();
      this.checkAutoStart(); // In case people remained ready
    }
    this.broadcastRoomUpdate();
  }

  private randomizeSongs(): void {
    // Save previous selections to avoid back-to-back repeats in the same room
    const previousLobbyIdx = this.lobbySongIndex;
    const previousFirstGameIdx = this.gameSongIndices.length > 0 ? this.gameSongIndices[0] : null;
    const previousVictoryIdx = this.victorySongIndex;

    // 1. Lobby track: choose a new one different from the previous match
    if (previousLobbyIdx !== undefined) {
      do {
        this.lobbySongIndex = Math.floor(Math.random() * 3);
      } while (this.lobbySongIndex === previousLobbyIdx);
    } else {
      this.lobbySongIndex = Math.floor(Math.random() * 3);
    }
    
    // 2. Game tracks: shuffle 10 songs and guarantee the FIRST song playing is different
    const indices = Array.from({ length: 10 }, (_, i) => i);
    do {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    } while (previousFirstGameIdx !== null && indices[0] === previousFirstGameIdx);
    this.gameSongIndices = indices;
    
    // 3. Victory track: choose a new one different from the previous match
    if (previousVictoryIdx !== undefined) {
      do {
        this.victorySongIndex = Math.floor(Math.random() * 3);
      } while (this.victorySongIndex === previousVictoryIdx);
    } else {
      this.victorySongIndex = Math.floor(Math.random() * 3);
    }
  }

  getFormattedConfig(): string {
    const colors = this.settings.maxColors ?? 6;
    let diffName = 'Normal';
    if (colors === 4) diffName = 'Easy';
    else if (colors === 8) diffName = 'Hard';
    else if (colors >= 10) diffName = 'Extreme';

    const speed = this.settings.gameSpeed ?? 'NORMAL';
    let speedStr = 'STANDARD';
    if (speed === 'CHILL') speedStr = 'CHILL';
    else if (speed === 'TURBO') speedStr = 'TURBO';

    const lives = this.settings.maxLives ?? 3;
    const livesStr = `${lives} ${lives === 1 ? 'Life' : 'Lives'}`;

    const playersCount = this.players.count();
    const maxPlayers = this.settings.maxPlayers || 8;
    const playersStr = `${playersCount}/${maxPlayers} Players`;

    let config = `${playersStr} • ${diffName} (${colors} Colors) • ${speedStr} • ${livesStr}`;
    if (this.settings.isBlindMode) {
      config += ' • BLIND';
    }
    return config;
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

  private checkAFK() {
    if (this.status !== 'waiting') return;
    const now = Date.now();

    // Safety check for empty rooms
    if (this.players.count() === 0) {
      console.log(`[Safety Cleanup] Room ${this.id} is empty but still registered. Closing.`);
      this.onClose?.(this.id);
      return;
    }

    const isTest = process.env.NODE_ENV === 'test';
    const host = this.players.get(this.hostId);
    const hostName = host?.name || '';

    const isAfkTest = isTest || hostName.includes('AFKTest');
    const isTimeoutTest = isTest || hostName.includes('TimeoutTest');

    const LOBBY_TIMEOUT = isTimeoutTest ? 6000 : 600000;      // 6 seconds in test, 10 minutes in prod
    const HOST_AFK_LIMIT = isAfkTest ? 4000 : 120000;       // 4 seconds in test, 120 seconds in prod
    const PLAYER_AFK_LIMIT = isTest ? 5000 : 90000;        // 5 seconds in test, 90 seconds in prod

    // Lobby inactivity timeout
    if (now - this.lobbyOpenTime > LOBBY_TIMEOUT) {
      console.log(`[Lobby Timeout] Room ${this.id} has been waiting in lobby for over 10 minutes (or test timeout). Closing.`);
      this.io.to(this.id).emit('room:error', { 
        message: 'La sala ha sido cerrada debido a inactividad prolongada (máximo 10 minutos). / The room has been closed due to prolonged inactivity (10 minutes maximum).'
      });
      
      // Kick all players to trigger automatic cleanup
      const allPlayers = this.players.getAll();
      for (const player of allPlayers) {
        this.kickPlayer(player.id, 'lobbyTimeoutReason');
      }
      
      // Notify registry to close and destroy this room
      this.onClose?.(this.id);
      return;
    }

    // Host AFK Check
    if (host) {
      const hostLastActive = host.lastActivityTime || now;
      if (now - hostLastActive > HOST_AFK_LIMIT) {
        console.log(`[Lobby AFK] Host "${host.name}" is AFK in room ${this.id}. Kicking.`);
        this.kickPlayer(this.hostId, 'afkKickReason');
        
        if (this.players.count() === 0) {
          this.onClose?.(this.id);
          return;
        }
      }
    }

    // Regular Player AFK Check
    for (const player of this.players.getAll()) {
      if (player.id !== this.hostId && !player.isReady) {
        const lastActive = player.lastActivityTime || now;
        if (now - lastActive > PLAYER_AFK_LIMIT) {
          this.kickPlayer(player.id, 'afkKickReason');
        }
      }
    }
  }

  private checkAutoStart() {
    if (this.status !== 'waiting') return;
    const { meetsThreshold } = this.players.getReadyStatus();
    
    if (meetsThreshold) {
      if (this.countdownType === null && this.autoStartSilentTimeout === null) {
        console.log(`[Lobby] Ready threshold met in room ${this.id}. Starting 20s silent auto-start timer...`);
        this.autoStartSilentTimeout = setTimeout(() => {
          this.autoStartSilentTimeout = null;
          console.log(`[Lobby] 20s silent timer expired in room ${this.id}. Starting 10s visible countdown...`);
          this.startCountdown(10, true);
        }, 20000);
      }
    } else {
      if (this.autoStartSilentTimeout) {
        console.log(`[Lobby] Ready threshold lost in room ${this.id}. Cancelling 20s silent timer.`);
        clearTimeout(this.autoStartSilentTimeout);
        this.autoStartSilentTimeout = null;
      }
      if (this.countdownType === 'auto') {
        this.cancelCountdown();
      }
    }
  }

  private startCountdown(seconds: number, isAuto: boolean) {
    this.cancelCountdown();

    this.countdownSeconds = seconds;
    this.countdownType = isAuto ? 'auto' : 'manual';

    // Broadcast the initial tick
    this.io.to(this.id).emit('room:auto_start_countdown', { 
      seconds: this.countdownSeconds, 
      isAuto 
    });

    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds > 0) {
        this.io.to(this.id).emit('room:auto_start_countdown', { 
          seconds: this.countdownSeconds, 
          isAuto 
        });
      }
    }, 1000);

    this.countdownTimeout = setTimeout(() => {
      this.cancelCountdown();

      // Check if we still have enough players to start the game
      const { meetsThreshold } = this.players.getReadyStatus();
      if (this.players.count() >= 2 && (meetsThreshold || !isAuto)) {
        this.status = 'playing';
        console.log(`[Game] Room ${this.id} started automatically/manually with ${this.players.count()} players.`);
        
        for (const player of this.players.getAll()) {
          player.lives = this.settings.maxLives ?? 3;
        }

        this.loop.start(this.startingRound);
      }
    }, seconds * 1000);
  }

  cancelCountdown(isManual = false) {
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.autoStartSilentTimeout) {
      clearTimeout(this.autoStartSilentTimeout);
      this.autoStartSilentTimeout = null;
    }
    this.countdownSeconds = 0;
    this.countdownType = null;

    if (isManual) {
      this.cancellationCount++;
    }

    this.io.to(this.id).emit('room:auto_start_countdown', { seconds: null });
    this.broadcastRoomUpdate();
  }
}
