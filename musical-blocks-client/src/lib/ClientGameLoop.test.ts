import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientGameLoop } from './ClientGameLoop';
import { ClientGridManager } from './ClientGridManager';
import { ClientPlayerController } from './ClientPlayerController';

describe('ClientGameLoop', () => {
  let grid: ClientGridManager;
  let player: ClientPlayerController;
  let callbacks: any;
  let gameLoop: ClientGameLoop;

  beforeEach(() => {
    vi.useFakeTimers();

    grid = new ClientGridManager();
    player = new ClientPlayerController();

    callbacks = {
      onRoundStart: vi.fn(),
      onAnnounce: vi.fn(),
      onEliminate: vi.fn(),
      onGameOver: vi.fn(),
      onTimeTick: vi.fn(),
      onStateUpdate: vi.fn(),
    };

    gameLoop = new ClientGameLoop(grid, player, callbacks);
  });

  afterEach(() => {
    gameLoop.stop();
    vi.restoreAllMocks();
  });

  it('starts game loop and transitions to STARTING phase', () => {
    expect(gameLoop.isRunning()).toBe(false);

    gameLoop.start({
      maxColors: 6,
      gameSpeed: 'NORMAL',
      maxLives: 3,
      suddenDeathMode: 'NORMAL',
      maxPlayers: 8,
    });

    expect(gameLoop.isRunning()).toBe(true);
    expect(gameLoop.getPhase()).toBe('STARTING');
    expect(callbacks.onStateUpdate).toHaveBeenCalledWith(
      'STARTING',
      expect.any(Number),
      expect.any(Array),
      expect.any(Object),
      3,
      true
    );
  });

  it('advances through STARTING -> DANCING phase', () => {
    gameLoop.start({
      maxColors: 6,
      gameSpeed: 'NORMAL',
      maxLives: 3,
      suddenDeathMode: 'NORMAL',
      maxPlayers: 8,
    });

    // Advance past STARTING phase (4000ms)
    vi.advanceTimersByTime(4050);

    expect(gameLoop.getPhase()).toBe('DANCING');
    expect(gameLoop.getRound()).toBe(1);
    expect(callbacks.onRoundStart).toHaveBeenCalledWith(
      1,
      expect.any(Number),
      expect.any(Array),
      expect.any(Object)
    );
  });

  it('stops game loop and resets phase to LOBBY', () => {
    gameLoop.start({
      maxColors: 6,
      gameSpeed: 'NORMAL',
      maxLives: 3,
      suddenDeathMode: 'NORMAL',
      maxPlayers: 8,
    });

    gameLoop.stop();

    expect(gameLoop.isRunning()).toBe(false);
    expect(gameLoop.getPhase()).toBe('LOBBY');
  });
});
