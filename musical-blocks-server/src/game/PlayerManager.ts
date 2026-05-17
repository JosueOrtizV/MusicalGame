import {
  Direction,
  GridPosition,
  Player,
  GRID_SIZE,
  LAG_TOLERANCE_MS,
  MOVE_RATE_LIMIT_MS,
  PLAYER_COLORS,
} from '@shared/types';
import { GridManager } from './GridManager';

// ---------------------------------------------------------------------------
//  PlayerManager
//  Tracks players, validates & applies moves authoritatively.
// ---------------------------------------------------------------------------
export class PlayerManager {
  private players: Map<string, Player> = new Map();
  private lastMoveTime: Map<string, number> = new Map();
  private colorIndex = 0;

  // ---- Player lifecycle ----------------------------------------------------

  add(socketId: string, name: string, isHost: boolean): Player {
    const player: Player = {
      id: socketId,
      name,
      position: this.randomSpawnPosition(),
      isAlive: true,
      lives: 0,
      isReady: false,
      isHost,
      color: PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length],
      hasReturnedToLobby: true,
    };
    this.colorIndex++;
    this.players.set(socketId, player);
    return player;
  }

  remove(socketId: string): void {
    this.players.delete(socketId);
    this.lastMoveTime.delete(socketId);
  }

  get(socketId: string): Player | undefined {
    return this.players.get(socketId);
  }

  setReady(socketId: string, ready: boolean): void {
    const p = this.players.get(socketId);
    if (p) p.isReady = ready;
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

  allReady(): boolean {
    const all = this.getAll();
    return all.length >= 2 && all.every(p => p.isReady);
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
    grid: GridManager
  ): boolean {
    const player = this.players.get(socketId);
    if (!player || !player.isAlive) return false;

    const serverNow = Date.now();
    const lag = serverNow - clientTimestamp;

    // Reject extreme lag or future timestamps (allow 2s in either direction)
    if (Math.abs(lag) > LAG_TOLERANCE_MS) {
      return false;
    }
    
    // Rate-limit: player cannot move faster than once per MOVE_RATE_LIMIT_MS
    const lastMove = this.lastMoveTime.get(socketId) ?? 0;
    if (serverNow - lastMove < MOVE_RATE_LIMIT_MS) {
      return false;
    }

    // Bounds check on destination
    const next = applyDirection(player.position, direction);
    if (!isInBounds(next)) {
      return false;
    }

    // Check if block is permanently dead (Sudden Death)
    if (grid.isBlockDead(next)) {
      return false;
    }

    return true;
  }

  /** Apply a pre-validated move. Returns the new position. */
  applyMove(socketId: string, direction: Direction): GridPosition {
    const player = this.players.get(socketId)!;
    player.position = applyDirection(player.position, direction);
    this.lastMoveTime.set(socketId, Date.now());
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
      player.isReady = false;
      player.hasReturnedToLobby = true;
    }
    this.lastMoveTime.clear();
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
    UP:    { x: 0,  z: -1 },
    DOWN:  { x: 0,  z: 1  },
    LEFT:  { x: -1, z: 0  },
    RIGHT: { x: 1,  z: 0  },
  };
  const d = deltas[dir];
  return { x: pos.x + d.x, z: pos.z + d.z };
}

export function isInBounds(pos: GridPosition): boolean {
  return pos.x >= 0 && pos.x < GRID_SIZE && pos.z >= 0 && pos.z < GRID_SIZE;
}
