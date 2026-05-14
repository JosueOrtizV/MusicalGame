import {
  GamePhase,
  GameState,
  BlockColor,
  ROUND_DURATIONS,
} from '@shared/types';
import { GridManager } from './GridManager';
import { PlayerManager } from './PlayerManager';

// Phase durations in milliseconds
const PHASE_DURATIONS: Partial<Record<GamePhase, number>> = {
  ELIMINATING: 2_000,
  ROUND_END:   2_500,
};

// Callbacks the GameRoom provides to hook into phase transitions
export interface GameLoopCallbacks {
  onRoundStart:  (round: number, duration: number) => void;
  onAnnounce:    (winnerColor: BlockColor, counts: Record<BlockColor, number>) => void;
  onEliminate:   (eliminated: Array<{ row: number; col: number }>, deadIds: string[]) => void;
  onGameOver:    (winnerId: string | null, winnerName: string | null) => void;
  onTimeTick:    (timeLeft: number) => void;
}

// ---------------------------------------------------------------------------
//  GameLoop — authoritative server-side game loop
// ---------------------------------------------------------------------------
export class GameLoop {
  private readonly TICK_RATE = 20;                        // ticks per second
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE; // ~50 ms

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastHrTime: bigint = BigInt(0);

  private phase: GamePhase = 'LOBBY';
  private round = 0;
  private phaseMs = 0;    // ms remaining in current phase
  private danceMs = 0;    // ms remaining in DANCING phase specifically
  private announceMs = 0; // ms allocated for ANNOUNCING phase in current round
  private lastEmittedSecond = -1;

  constructor(
    private readonly grid: GridManager,
    private readonly players: PlayerManager,
    private readonly callbacks: GameLoopCallbacks,
  ) {}

  // ---- Public API ----------------------------------------------------------

  start(): void {
    if (this.timer) return; // already running
    this.round = 0;
    this.lastHrTime = process.hrtime.bigint();
    this.timer = setInterval(() => this.tick(), this.TICK_INTERVAL);
    this.transitionTo('DANCING');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  // ---- Core tick -----------------------------------------------------------

  private tick(): void {
    const now = process.hrtime.bigint();
    const deltaMs = Number(now - this.lastHrTime) / 1_000_000;
    this.lastHrTime = now;

    this.phaseMs = Math.max(0, this.phaseMs - deltaMs);
    if (this.phase === 'DANCING') {
      this.danceMs = Math.max(0, this.danceMs - deltaMs);
    }

    // Emit timeLeft once per second to avoid network spam
    const secondsLeft = Math.ceil(this.phaseMs / 1000);
    if (secondsLeft !== this.lastEmittedSecond) {
      this.lastEmittedSecond = secondsLeft;
      this.callbacks.onTimeTick(secondsLeft);
    }

    if (this.phaseMs <= 0) {
      this.advancePhase();
    }
  }

  // ---- Phase machine -------------------------------------------------------

  private transitionTo(next: GamePhase): void {
    this.phase = next;
    this.lastEmittedSecond = -1;

    switch (next) {
      case 'DANCING': {
        this.round++;
        const blocks = this.grid.generate(this.round);
        this.players.resetForRound(this.grid);
        const totalDurationS = ROUND_DURATIONS[Math.min(this.round - 1, ROUND_DURATIONS.length - 1)];
        
        let announceS: number;
        let danceS: number;

        if (this.round >= 10) {
          announceS = 2;
          danceS = Math.max(2, totalDurationS - announceS);
        } else if (this.round >= 8) {
          announceS = 3;
          danceS = Math.max(2, totalDurationS - announceS);
        } else {
          announceS = Math.max(4, Math.floor(totalDurationS * 0.4));
          danceS = Math.max(3, totalDurationS - announceS);
        }
        
        this.announceMs = announceS * 1000;
        this.danceMs = danceS * 1000;
        this.phaseMs = this.danceMs;
        
        // We report 'danceS' as the duration to the client for the HUD timer
        this.callbacks.onRoundStart(this.round, danceS);
        break;
      }

      case 'ANNOUNCING': {
        const winnerColor = this.grid.pickWinnerColor();
        const counts = this.grid.getColorDistribution();
        this.phaseMs = this.announceMs;
        // Store winner for ELIMINATING phase
        (this as unknown as { _pendingWinner: BlockColor })._pendingWinner = winnerColor;
        this.callbacks.onAnnounce(winnerColor, counts);
        break;
      }

      case 'ELIMINATING': {
        const winner = (this as unknown as { _pendingWinner: BlockColor })._pendingWinner;
        const eliminated = this.grid.eliminate(winner);
        const deadIds = this.players.checkDeaths(this.grid);
        this.phaseMs = PHASE_DURATIONS.ELIMINATING!;
        this.callbacks.onEliminate(eliminated, deadIds);
        break;
      }

      case 'ROUND_END': {
        this.phaseMs = PHASE_DURATIONS.ROUND_END!;
        break;
      }

      case 'GAME_OVER': {
        this.stop();
        const winner = this.players.getWinner();
        this.callbacks.onGameOver(winner?.id ?? null, winner?.name ?? null);
        break;
      }
    }
  }

  private advancePhase(): void {
    switch (this.phase) {
      case 'DANCING':    return this.transitionTo('ANNOUNCING');
      case 'ANNOUNCING': return this.transitionTo('ELIMINATING');

      case 'ELIMINATING': {
        const alive = this.players.getAlive();
        if (alive.length <= 1) {
          return this.transitionTo('GAME_OVER');
        }
        return this.transitionTo('ROUND_END');
      }

      case 'ROUND_END': return this.transitionTo('DANCING');
    }
  }
}
