// =============================================================================
//  Musical Blocks — Shared Types
//  Single source of truth for client and server.
//  Both packages import from this directory.
// =============================================================================

// ---------------------------------------------------------------------------
//  Primitives
// ---------------------------------------------------------------------------

export type BlockColor =
  | 'RED'
  | 'BLUE'
  | 'GREEN'
  | 'YELLOW'
  | 'PURPLE'
  | 'ORANGE'
  | 'PINK'
  | 'CYAN'
  | 'LIME'
  | 'WHITE';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GamePhase =
  | 'LOBBY'        // Waiting for players / host to start
  | 'DANCING'      // Players move freely on the grid
  | 'ANNOUNCING'   // Server reveals winning color (3 s)
  | 'ELIMINATING'  // Non-winning blocks fall away (2 s)
  | 'ROUND_END'    // Brief pause before next round (2 s)
  | 'GAME_OVER';   // One (or zero) players remain

export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type RoomVisibility = 'public' | 'private';

// ---------------------------------------------------------------------------
//  Domain Models
// ---------------------------------------------------------------------------

/** Grid coordinates — zero-indexed, 0..GRID_SIZE-1 */
export interface GridPosition {
  x: number; // column (0 = leftmost)
  z: number; // row    (0 = nearest)
}

/** A single player in the game */
export interface Player {
  id: string;          // socket.id
  name: string;        // display alias (3–16 chars, alphanumeric + spaces)
  position: GridPosition;
  isAlive: boolean;
  lives: number;       // number of lives remaining for the player
  isReady: boolean;    // toggled in lobby before game starts
  isHost: boolean;     // only relevant for private rooms
  color: string;       // hex avatar color, assigned on join
  hasReturnedToLobby: boolean; // true if player is waiting in lobby, false if viewing results
}

/** A single cell in the 12×12 grid */
export interface GameBlock {
  row: number;         // 0..11
  col: number;         // 0..11
  color: BlockColor;
  isActive: boolean;   // false = eliminated / falling
  isDead?: boolean;    // permanently eliminated (sudden death)
}

/** Full game state snapshot sent to all clients on every relevant change */
export interface GameState {
  phase: GamePhase;
  round: number;
  timeLeft: number;         // seconds remaining in current phase
  isBlackout: boolean;      // true if the arena is currently grayed out (Blind Mode)
  winnerColor: BlockColor | null;
  blocks: GameBlock[][];    // [row][col], always 12×12
  players: Player[];
  winnerId: string | null;  // playerId of the winner, set on GAME_OVER
}

// ---------------------------------------------------------------------------
//  Room
// ---------------------------------------------------------------------------

/** Lightweight room descriptor — sent in the public room list */
export interface RoomSummary {
  id: string;           // e.g. "AZUL"
  visibility: RoomVisibility;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;   // always 8
  hostName: string;
}

export type GameSpeed = 'CHILL' | 'NORMAL' | 'TURBO';

export interface RoomSettings {
  maxColors: number; // 4, 6, 8, 10
  gameSpeed: GameSpeed;
  isBlindMode?: boolean;
  maxLives?: number; // 1 to 5 lives
}

/** Full room details — only sent to members of that room */
export interface Room {
  id: string;
  visibility: RoomVisibility;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  hostId: string;       // socket.id of the host
  gameState: GameState | null; // null while in LOBBY phase
  settings: RoomSettings;
}

// ---------------------------------------------------------------------------
//  Socket.io Event Maps
//  Usage on server:  io.on('connection', (socket: Socket<ClientEvents, ServerEvents>) => …)
//  Usage on client:  const socket: Socket<ServerEvents, ClientEvents> = io(…)
// ---------------------------------------------------------------------------

/** Events the SERVER emits → CLIENT receives */
export interface ServerEvents {
  // Room lifecycle
  'room:joined':       (payload: { room: Room; localPlayerId: string }) => void;
  'room:updated':      (payload: { room: Room }) => void;
  'room:list':         (rooms: RoomSummary[]) => void;
  'room:error':        (payload: { message: string }) => void;
  'room:kicked':       (payload: { reason: string }) => void;

  // Game lifecycle
  'game:countdown':    (payload: { seconds: number }) => void;       // 3-2-1 before DANCING
  'game:round_start':  (payload: { round: number; duration: number; blocks: GameBlock[][] }) => void;
  'game:state':        (state: GameState) => void;                   // periodic full snapshot
  'game:time_sync':    (payload: { serverTime: number }) => void;    // clock sync
  'game:announce':     (payload: { winnerColor: BlockColor; colorCounts: Record<BlockColor, number> }) => void;
  'game:eliminate':    (payload: { eliminatedBlocks: Array<{ row: number; col: number }> }) => void;
  'game:player_died':  (payload: { playerId: string; playerName: string }) => void;
  'game:over':         (payload: { winnerId: string | null; winnerName: string | null }) => void;

  // Network / ping
  'pong':              (payload: { serverTime: number; clientTime: number }) => void;
}

/** Events the CLIENT emits → SERVER receives */
export interface ClientEvents {
  // Room management
  'room:create':       (payload: { playerName: string; visibility: RoomVisibility }, cb: (room: Room) => void) => void;
  'room:join_public':  (payload: { playerName: string }, cb: (room: Room | null, error?: string) => void) => void;
  'room:join_private': (payload: { playerName: string; code: string }, cb: (room: Room | null, error?: string) => void) => void;
  'room:get_list':     () => void;
  'room:leave':        () => void;

  // Lobby actions
  'player:ready':      (payload: { ready: boolean }) => void;
  'host:start_game':   () => void; // host-only: force start
  'host:back_to_lobby': () => void; // host-only: reset game to waiting state
  'player:return_lobby': () => void; // player returns to lobby while game is finished
  'host:kick_player':  (payload: { playerId: string }) => void; // host-only: kick player
  'host:update_settings': (payload: { settings: RoomSettings }) => void;


  // In-game actions
  'player:move':       (payload: { direction: Direction; timestamp: number }) => void;

  // Network / ping
  'ping':              (payload: { clientTime: number }) => void;
}

// ---------------------------------------------------------------------------
//  Constants (shared between client and server)
// ---------------------------------------------------------------------------

export const GRID_SIZE = 12;        // 12×12 = 144 blocks
export const MAX_PLAYERS = 8;
export const BLOCK_SIZE = 1.1;      // world units (0.1 gap between blocks)
export const LAG_TOLERANCE_MS = 2000; // Increase tolerance for local dev clock skew
export const MOVE_RATE_LIMIT_MS = 100; // min ms between moves

/** Hex values for each BlockColor — used by both Three.js and CSS */
export const COLOR_HEX: Record<BlockColor, string> = {
  RED:    '#E53E3E',
  BLUE:   '#3182CE',
  GREEN:  '#38A169',
  YELLOW: '#D69E2E',
  PURPLE: '#805AD5',
  ORANGE: '#DD6B20',
  PINK:   '#ED64A6',
  CYAN:   '#00B5D8',
  LIME:   '#39FF14',
  WHITE:  '#E2E8F0',
};

/** Player avatar colors — cycled on join */
export const PLAYER_COLORS: string[] = [
  '#F6E05E', // yellow
  '#FC8181', // red
  '#68D391', // green
  '#76E4F7', // cyan
  '#B794F4', // purple
  '#FBD38D', // orange
  '#F687B3', // pink
  '#90CDF4', // light blue
];

/** Round durations in seconds — index = round-1, clamped at last value */
export const ROUND_DURATIONS: Record<GameSpeed, number[]> = {
  CHILL:  [25, 22, 20, 18, 16, 15, 14, 12, 12, 12],
  NORMAL: [30, 25, 20, 15, 12, 10,  8,  6,  6,  6],
  TURBO:  [15, 12, 10,  8,  6,  5,  4,  4,  4,  4]
};
