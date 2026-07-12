import {
  GamePhase,
  BlockColor,
  GameSpeed,
  GameBlock,
  GridPosition,
  RoomSettings,
  SuddenDeathMode,
} from '@/src/shared/types';
import { ClientGridManager } from './ClientGridManager';
import { ClientPlayerController } from './ClientPlayerController';

const PHASE_DURATIONS: Partial<Record<GamePhase, number>> = {
  STARTING: 4_000,
  ELIMINATING: 2_000,
  ROUND_END: 2_500,
};

export interface ClientGameLoopCallbacks {
  onRoundStart: (round: number, duration: number, blocks: GameBlock[][], playerPos: GridPosition) => void;
  onAnnounce: (winnerColor: BlockColor) => void;
  onEliminate: (eliminated: Array<{ row: number; col: number }>, lives: number, isAlive: boolean) => void;
  onGameOver: (finalScore: number, rounds: number) => void;
  onTimeTick: (timeLeft: number) => void;
  onStateUpdate: (phase: GamePhase, timeLeft: number, blocks: GameBlock[][], playerPos: GridPosition, lives: number, isAlive: boolean) => void;
}

export class ClientGameLoop {
  private readonly TICK_RATE = 20; // ticks per second
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE; // ~50ms

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTime = 0;

  private phase: GamePhase = 'LOBBY';
  private round = 0;
  private phaseMs = 0;
  private danceMs = 0;
  private announceMs = 0;
  private lastEmittedSecond = -1;
  private speed: GameSpeed = 'NORMAL';
  private suddenDeathMode: SuddenDeathMode = 'NORMAL';
  private pendingWinner: BlockColor | null = null;

  private lives = 3;
  private maxLives = 3;
  private isAlive = true;
  private score = 0;
  private isBlindMode = false;

  private telemetryStartTime = 0;
  private telemetryRounds: Array<{ round: number; timestamp: number }> = [];

  constructor(
    private readonly grid: ClientGridManager,
    private readonly player: ClientPlayerController,
    private readonly callbacks: ClientGameLoopCallbacks
  ) { }

  start(settings: RoomSettings): void {
    if (this.timer) return;
    this.round = 0;
    this.score = 0;
    this.lives = settings.maxLives ?? 3;
    this.maxLives = settings.maxLives ?? 3;
    this.isAlive = true;
    this.speed = settings.gameSpeed || 'NORMAL';
    this.isBlindMode = settings.isBlindMode || false;
    this.suddenDeathMode = settings.suddenDeathMode || 'NORMAL';
    this.grid.setMaxColors(settings.maxColors ?? 6);
    this.grid.setSuddenDeathMode(settings.suddenDeathMode || 'NORMAL');

    this.telemetryStartTime = Date.now();
    this.telemetryRounds = [];

    this.lastTime = performance.now();
    this.timer = setInterval(() => this.tick(), this.TICK_INTERVAL);
    this.transitionTo('STARTING');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.phase = 'LOBBY';
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  setDifficulty(colorsCount: number): void {
    this.grid.setMaxColors(colorsCount);
  }

  private tick(): void {
    const now = performance.now();
    const deltaMs = now - this.lastTime;
    this.lastTime = now;

    this.phaseMs = Math.max(0, this.phaseMs - deltaMs);
    if (this.phase === 'DANCING') {
      this.danceMs = Math.max(0, this.danceMs - deltaMs);
    }

    const secondsLeft = Math.ceil(this.phaseMs / 1000);
    if (secondsLeft !== this.lastEmittedSecond) {
      this.lastEmittedSecond = secondsLeft;
      this.callbacks.onTimeTick(secondsLeft);
    }

    if (this.phaseMs <= 0) {
      this.advancePhase();
    }
  }

  private transitionTo(next: GamePhase): void {
    this.phase = next;
    this.lastEmittedSecond = -1;

    switch (next) {
      case 'STARTING': {
        this.phaseMs = PHASE_DURATIONS.STARTING!;
        this.grid.generate(1);

        // Spawn player in center
        this.player.setPosition({ x: 5, z: 5 });
        this.callbacks.onStateUpdate(this.phase, Math.ceil(this.phaseMs / 1000), this.grid.getSnapshot(), this.player.getPosition(), this.lives, this.isAlive);
        break;
      }

      case 'DANCING': {
        this.round++;
        this.telemetryRounds.push({ round: this.round, timestamp: Date.now() });
        if (this.round > 1) {
          this.grid.generate(this.round);
          // Revive player if they were dead but had lives left
          if (!this.isAlive && this.lives > 0) {
            this.isAlive = true;
          }
          // Spawn player on a valid tile
          const validSpawnPos = this.grid.getValidSpawnPositions();
          if (validSpawnPos.length > 0) {
            this.player.setPosition(validSpawnPos[Math.floor(Math.random() * validSpawnPos.length)]);
          }
        }

        let announceS: number;
        let danceS: number;

        if (this.round <= 10) {
          const t = (this.round - 1) / 9; // 0 to 1
          if (this.speed === 'CHILL') {
            announceS = 8.0 + t * (3.0 - 8.0);
            danceS = 17.0 + t * (4.0 - 17.0);
          } else if (this.speed === 'TURBO') {
            announceS = 4.0 + t * (1.5 - 4.0);
            danceS = 8.0 + t * (2.0 - 8.0);
          } else { // NORMAL
            announceS = 7.0 + t * (2.0 - 7.0);
            danceS = 18.0 + t * (3.0 - 18.0);
          }
        } else {
          const t = Math.min(1.0, (this.round - 10) / 90); // 0 to 1
          if (this.speed === 'CHILL') {
            announceS = 3.0 + t * (2.2 - 3.0);
            danceS = 4.0 + t * (2.8 - 4.0);
          } else if (this.speed === 'TURBO') {
            announceS = 1.5 + t * (1.2 - 1.5);
            danceS = 2.0 + t * (1.3 - 2.0);
          } else { // NORMAL
            announceS = 2.0 + t * (1.5 - 2.0);
            danceS = 3.0 + t * (1.7 - 3.0);
          }
        }

        this.announceMs = announceS * 1000;
        this.danceMs = danceS * 1000;
        this.phaseMs = this.danceMs;

        this.callbacks.onRoundStart(this.round, Math.ceil(danceS), this.grid.getSnapshot(), this.player.getPosition());
        this.callbacks.onStateUpdate(this.phase, Math.ceil(this.phaseMs / 1000), this.grid.getSnapshot(), this.player.getPosition(), this.lives, this.isAlive);
        break;
      }

      case 'ANNOUNCING': {
        const winnerColor = this.grid.pickWinnerColor();
        this.phaseMs = this.announceMs;

        // Store winner for ELIMINATING phase
        this.pendingWinner = winnerColor;
        this.callbacks.onAnnounce(winnerColor);
        this.callbacks.onStateUpdate(this.phase, Math.ceil(this.phaseMs / 1000), this.grid.getSnapshot(), this.player.getPosition(), this.lives, this.isAlive);
        break;
      }

      case 'ELIMINATING': {
        const winner = this.pendingWinner;
        const eliminated = this.grid.eliminate(winner || 'RED');
        this.phaseMs = PHASE_DURATIONS.ELIMINATING!;

        // Check player death
        const pPos = this.player.getPosition();
        if (!this.grid.isBlockActive(pPos)) {
          this.isAlive = false;
          this.lives = Math.max(0, this.lives - 1);
        } else {
          // Add points for surviving with new multipliers
          const difficultyMultiplier = this.grid.getColorDistribution();
          const colorsCount = Object.values(difficultyMultiplier).reduce((a, b) => a + (b > 0 ? 1 : 0), 0);

          // 1. Color Multiplier
          let colorMult = 1.5;
          if (colorsCount <= 4) colorMult = 1.0;
          else if (colorsCount <= 6) colorMult = 1.5;
          else if (colorsCount <= 8) colorMult = 2.0;
          else colorMult = 3.0;

          // 2. Speed Multiplier (flat, no decay because speeds do not converge)
          let speedMult = 1.0;
          if (this.speed === 'CHILL') speedMult = 0.8;
          else if (this.speed === 'TURBO') speedMult = 2.0;

          // 3. Sudden Death Multiplier
          let sdMult = 1.0;
          if (this.suddenDeathMode === 'OFF') sdMult = 0.5;
          else if (this.suddenDeathMode === 'CHAOS') sdMult = 2.0;

          // 4. Blind Mode Multiplier
          const blindMult = this.isBlindMode ? 2.0 : 1.0;

          // 5. Max Lives Multiplier
          let livesMult = 1.0;
          if (this.maxLives === 1) livesMult = 1.5;
          else if (this.maxLives === 2) livesMult = 1.2;
          else if (this.maxLives === 3) livesMult = 1.0;
          else if (this.maxLives === 4) livesMult = 0.9;
          else if (this.maxLives === 5) livesMult = 0.8;

          // Total Points formula
          const basePoints = this.round * 10;
          const totalMult = colorMult * speedMult * sdMult * blindMult * livesMult;
          this.score += Math.round(basePoints * totalMult);
        }

        this.callbacks.onEliminate(eliminated, this.lives, this.isAlive);
        this.callbacks.onStateUpdate(this.phase, Math.ceil(this.phaseMs / 1000), this.grid.getSnapshot(), this.player.getPosition(), this.lives, this.isAlive);
        break;
      }

      case 'ROUND_END': {
        this.phaseMs = PHASE_DURATIONS.ROUND_END!;
        this.callbacks.onStateUpdate(this.phase, Math.ceil(this.phaseMs / 1000), this.grid.getSnapshot(), this.player.getPosition(), this.lives, this.isAlive);
        break;
      }

      case 'GAME_OVER': {
        this.stop();
        this.callbacks.onGameOver(this.score, this.round);
        break;
      }
    }
  }

  private advancePhase(): void {
    switch (this.phase) {
      case 'STARTING': return this.transitionTo('DANCING');
      case 'DANCING': return this.transitionTo('ANNOUNCING');
      case 'ANNOUNCING': return this.transitionTo('ELIMINATING');

      case 'ELIMINATING': {
        if (this.lives <= 0) {
          return this.transitionTo('GAME_OVER');
        }
        return this.transitionTo('ROUND_END');
      }

      case 'ROUND_END': return this.transitionTo('DANCING');
    }
  }

  getScore(): number {
    return this.score;
  }

  getRound(): number {
    return this.round;
  }

  getSpeed(): GameSpeed {
    return this.speed;
  }

  getMaxLives(): number {
    return this.maxLives;
  }

  getSuddenDeathMode(): SuddenDeathMode {
    return this.suddenDeathMode;
  }

  getIsBlindMode(): boolean {
    return this.isBlindMode;
  }

  getPendingWinner(): BlockColor | null {
    return this.pendingWinner;
  }

  getLives(): number {
    return this.lives;
  }

  getIsAlive(): boolean {
    return this.isAlive;
  }

  getTimeLeft(): number {
    return Math.ceil(this.phaseMs / 1000);
  }

  getIsBlackout(): boolean {
    if (!this.isBlindMode) return false;
    return this.phase === 'ANNOUNCING';
  }

  getTelemetry() {
    return {
      startTime: this.telemetryStartTime,
      rounds: this.telemetryRounds,
    };
  }
}