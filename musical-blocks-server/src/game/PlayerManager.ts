import {
  Direction,
  GridPosition,
  Player,
  GRID_SIZE,
  LAG_TOLERANCE_MS,
  MOVE_RATE_LIMIT_MS,
  PLAYER_COLORS,
  DASH_COOLDOWN_MS,
} from '@shared/types';
import { GridManager } from './GridManager';
import { securityLogger } from '../utils/logger';

// ---------------------------------------------------------------------------
//  PlayerManager
//  Tracks players, validates & applies moves authoritatively.
// ---------------------------------------------------------------------------
export class PlayerManager {
  private players: Map<string, Player> = new Map();
  private lastMoveTime: Map<string, number> = new Map();
  private lastDashTime: Map<string, number> = new Map();

  // ---- Player lifecycle ----------------------------------------------------

  add(socketId: string, name: string, isHost: boolean): Player {
    const takenColors = Array.from(this.players.values()).map((p) => p.color);
    const availableColors = PLAYER_COLORS.filter((c) => !takenColors.includes(c));
    const chosenColor = availableColors.length > 0
      ? availableColors[Math.floor(Math.random() * availableColors.length)]
      : PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

    const player: Player = {
      id: socketId,
      name,
      position: this.randomSpawnPosition(),
      isAlive: true,
      lives: 0,
      isReady: isHost,
      isHost,
      color: chosenColor,
      hasReturnedToLobby: true,
      lastActivityTime: Date.now(),
      cosmetics: {
        companionType: 'none',
        headphonesEnabled: true,
        backpackEnabled: true,
        skinMaterial: 'matte',
        shoesColor: chosenColor,
        visorColor: chosenColor,
        heartColor: chosenColor,
        headphonesColor: chosenColor,
        backpackColor: chosenColor,
        companionColor: chosenColor,
      },
    };
    this.players.set(socketId, player);
    return player;
  }

  remove(socketId: string): void {
    this.players.delete(socketId);
    this.lastMoveTime.delete(socketId);
    this.lastDashTime.delete(socketId);
  }

  get(socketId: string): Player | undefined {
    return this.players.get(socketId);
  }

  setReady(socketId: string, ready: boolean): void {
    const p = this.players.get(socketId);
    if (p) {
      p.isReady = ready;
      p.lastActivityTime = Date.now();
    }
  }

  updateActivity(socketId: string): void {
    const p = this.players.get(socketId);
    if (p) p.lastActivityTime = Date.now();
  }

  getAll(): Player[] {
    return Array.from(this.players.values());
  }

  getAlive(): Player[] {
    return this.getAll().filter(p => p.isAlive);
  }

  getWithLives(): Player[] {
    return this.getAll().filter(p => p.lives > 0);
  }

  getWinner(): Player | null {
    const withLives = this.getWithLives();
    return withLives.length === 1 ? withLives[0] : null;
  }

  getReadyStatus(): { meetsThreshold: boolean; readyCount: number; requiredCount: number } {
    const all = this.getAll();
    const readyCount = all.filter(p => p.isReady).length;
    const requiredCount = Math.max(2, Math.ceil(all.length / 2));
    
    return {
      meetsThreshold: all.length >= 2 && readyCount >= requiredCount,
      readyCount,
      requiredCount,
    };
  }

  count(): number {
    return this.players.size;
  }

  // ---- Move validation & application ---------------------------------------

  /**
   * Validates a move request.
   * Returns true if the move should be applied; false = silently rejected.
   */
  validateMove(
    socketId: string,
    direction: Direction,
    clientTimestamp: number,
    grid: GridManager,
    enableCollisions?: boolean
  ): boolean {
    const player = this.players.get(socketId);
    if (!player || !player.isAlive) return false;

    const serverNow = Date.now();
    const lag = serverNow - clientTimestamp;

    if (Math.abs(lag) > 5000) {
      securityLogger.warn({
        event: 'HARD_LAG_REJECTION',
        playerId: socketId,
        playerName: player.name,
        lagMs: lag,
      }, 'Hard lag rejection: >5s (potential exploitation or unplayable)');
      return false;
    }
    
    if (Math.abs(lag) > LAG_TOLERANCE_MS) {
      securityLogger.info({
        event: 'SOFT_LAG_WARNING',
        playerId: socketId,
        playerName: player.name,
        lagMs: lag,
      }, 'Soft lag warning: 2-5s (mobile/satellite)');
      // Still accept the move but flag the player for monitoring
    }
    
    const isDash = direction.startsWith('DASH_');

    // Rate-limit: player cannot move faster than once per MOVE_RATE_LIMIT_MS (except when dashing)
    if (!isDash) {
      const lastMove = this.lastMoveTime.get(socketId) ?? 0;
      const elapsed = serverNow - lastMove;
      if (elapsed < MOVE_RATE_LIMIT_MS) {
        securityLogger.warn({
          event: 'SUSPICIOUS_INPUT_RATE',
          playerId: socketId,
          playerName: player.name,
          elapsedMs: elapsed,
          limitMs: MOVE_RATE_LIMIT_MS
        }, 'Suspicious player move rate detected (potential speed-hack or input spam)');
        return false;
      }
    }

    const destination = applyDirection(player.position, direction);

    if (isDash) {
      // Cooldown check
      const lastDash = this.lastDashTime.get(socketId) ?? 0;
      if (serverNow - lastDash < DASH_COOLDOWN_MS) return false;

      // Validate intermediate cell (path check)
      const baseDir = direction.replace('DASH_', '') as Direction;
      const intermediate = applyDirection(player.position, baseDir);
      if (!isInBounds(intermediate) || grid.isBlockDead(intermediate)) return false;

      // Validate destination cell
      if (!isInBounds(destination) || grid.isBlockDead(destination)) return false;

      // Collision checks
      if (enableCollisions) {
        for (const p of this.players.values()) {
          if (p.id !== socketId && p.isAlive) {
            if ((p.position.x === intermediate.x && p.position.z === intermediate.z) ||
                (p.position.x === destination.x && p.position.z === destination.z)) {
              return false;
            }
          }
        }
      }
    } else {
      // Normal validation
      if (!isInBounds(destination) || grid.isBlockDead(destination)) return false;

      // Collision check
      if (enableCollisions) {
        for (const p of this.players.values()) {
          if (p.id !== socketId && p.isAlive && p.position.x === destination.x && p.position.z === destination.z) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /** Apply a pre-validated move. Returns the new position. */
  applyMove(socketId: string, direction: Direction): GridPosition {
    const player = this.players.get(socketId)!;
    player.position = applyDirection(player.position, direction);
    const now = Date.now();
    this.lastMoveTime.set(socketId, now);
    if (direction.startsWith('DASH_')) {
      this.lastDashTime.set(socketId, now);
    }
    return player.position;
  }

  // ---- Death detection -----------------------------------------------------

  /**
   * Check all alive players against the grid.
   * Returns the IDs of players now standing on eliminated blocks.
   */
  checkDeaths(grid: GridManager): string[] {
    const dead: string[] = [];
    for (const player of this.players.values()) {
      if (!player.isAlive) continue;
      if (!grid.isBlockActive(player.position)) {
        player.isAlive = false;
        player.lives = Math.max(0, player.lives - 1);
        dead.push(player.id);
      }
    }
    return dead;
  }

  // ---- Reset ---------------------------------------------------------------

  /** Reset alive status and ready state for all players (for post-game room reset) */
  resetAlive(): void {
    for (const player of this.players.values()) {
      player.isAlive = true;
      player.isReady = player.isHost;
      player.hasReturnedToLobby = true;
      player.lastActivityTime = Date.now();
    }
    this.lastMoveTime.clear();
    this.lastDashTime.clear();
  }

  /** Reset positions for a new round (only for alive players) */
  resetForRound(grid: GridManager): void {
    // Revive players who still have lives left
    for (const player of this.players.values()) {
      if (player.lives > 0) {
        player.isAlive = true;
      }
    }

    const alivePlayers = this.getAlive();
    const validPositions = grid.getValidSpawnPositions();
    
    // Shuffle valid positions
    for (let i = validPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
    }

    let i = 0;
    for (const player of alivePlayers) {
      // If we run out of valid positions (should never happen with max 10 dead blocks and max 8 players)
      player.position = validPositions[i % validPositions.length];
      i++;
    }
    this.lastMoveTime.clear();
    this.lastDashTime.clear();
  }

  // ---- Private helpers -----------------------------------------------------

  private randomSpawnPosition(grid?: GridManager): GridPosition {
    if (!grid) {
      return {
        x: Math.floor(Math.random() * GRID_SIZE),
        z: Math.floor(Math.random() * GRID_SIZE),
      };
    }
    const valid = grid.getValidSpawnPositions();
    return valid[Math.floor(Math.random() * valid.length)];
  }

  // generateSpawnPositions removed, players spawn purely randomly now
}

// ---------------------------------------------------------------------------
//  Pure helpers
// ---------------------------------------------------------------------------

export function applyDirection(pos: GridPosition, dir: Direction): GridPosition {
  const deltas: Record<Direction, GridPosition> = {
    // Cardinal (1 cell)
    UP:    { x: 0,  z: -1 },
    DOWN:  { x: 0,  z: 1  },
    LEFT:  { x: -1, z: 0  },
    RIGHT: { x: 1,  z: 0  },
    // Diagonal (1 cell)
    UP_LEFT:    { x: -1, z: -1 },
    UP_RIGHT:   { x: 1,  z: -1 },
    DOWN_LEFT:  { x: -1, z: 1  },
    DOWN_RIGHT: { x: 1,  z: 1  },
    // Dash cardinal (2 cells)
    DASH_UP:    { x: 0,  z: -2 },
    DASH_DOWN:  { x: 0,  z: 2  },
    DASH_LEFT:  { x: -2, z: 0  },
    DASH_RIGHT: { x: 2,  z: 0  },
    // Dash diagonal (2 cells)
    DASH_UP_LEFT:    { x: -2, z: -2 },
    DASH_UP_RIGHT:   { x: 2,  z: -2 },
    DASH_DOWN_LEFT:  { x: -2, z: 2  },
    DASH_DOWN_RIGHT: { x: 2,  z: 2  },
  };
  const d = deltas[dir];
  return { x: pos.x + d.x, z: pos.z + d.z };
}

export function isInBounds(pos: GridPosition): boolean {
  return pos.x >= 0 && pos.x < GRID_SIZE && pos.z >= 0 && pos.z < GRID_SIZE;
}
