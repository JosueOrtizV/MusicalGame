import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameLoop, GameLoopCallbacks } from './GameLoop';
import { GridManager } from './GridManager';
import { PlayerManager } from './PlayerManager';

describe('GameLoop', () => {
  let gameLoop: GameLoop;
  let gridManager: GridManager;
  let playerManager: PlayerManager;
  let callbacks: GameLoopCallbacks;

  beforeEach(() => {
    gridManager = new GridManager();
    playerManager = new PlayerManager();
    
    // Setup callbacks mocks
    callbacks = {
      onRoundStart: vi.fn(),
      onAnnounce: vi.fn(),
      onEliminate: vi.fn(),
      onGameOver: vi.fn(),
      onTimeTick: vi.fn(),
      onStateUpdate: vi.fn(),
    };

    // Spy on process.hrtime.bigint and tie it to Vitest's fake Date.now()
    vi.useFakeTimers();
    vi.spyOn(process.hrtime, 'bigint').mockImplementation(() => {
      return BigInt(Date.now() * 1_000_000);
    });

    gameLoop = new GameLoop(gridManager, playerManager, callbacks);
  });

  afterEach(() => {
    gameLoop.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('constructor should initialize in LOBBY phase', () => {
    expect(gameLoop.getPhase()).toBe('LOBBY');
    expect(gameLoop.isRunning()).toBe(false);
  });

  test('start should transition to STARTING phase', () => {
    gameLoop.start();
    expect(gameLoop.getPhase()).toBe('STARTING');
    expect(gameLoop.isRunning()).toBe(true);
  });

  test('tick should count down phase time and trigger transitions', () => {
    gameLoop.start();
    
    // STARTING phase is 4000ms. Advance timers by 4.1s.
    vi.advanceTimersByTime(4100);
    
    // Should transition to DANCING
    expect(gameLoop.getPhase()).toBe('DANCING');
    expect(callbacks.onRoundStart).toHaveBeenCalled();
  });

  test('DANCING to ANNOUNCING transition should pick winner and notify clients', () => {
    gameLoop.start();
    vi.advanceTimersByTime(4100); // go to DANCING
    
    expect(gameLoop.getPhase()).toBe('DANCING');
    
    // For Round 1, NORMAL speed is 25s total.
    // splits: announce = 10s, dance = 15s.
    // Let's advance DANCING by 15.1s
    vi.advanceTimersByTime(15100);
    
    expect(gameLoop.getPhase()).toBe('ANNOUNCING');
    expect(callbacks.onAnnounce).toHaveBeenCalled();
  });

  test('BlindMode flag should trigger blackout during ANNOUNCING phase', () => {
    gameLoop.setBlindMode(true);
    gameLoop.start();
    
    vi.advanceTimersByTime(4100); // DANCING
    expect(gameLoop.getIsBlackout()).toBe(false);
    
    vi.advanceTimersByTime(15100); // ANNOUNCING
    expect(gameLoop.getPhase()).toBe('ANNOUNCING');
    expect(gameLoop.getIsBlackout()).toBe(true);
    expect(callbacks.onStateUpdate).toHaveBeenCalled();
  });

  test('Game Over should trigger if <= 1 players survive the ELIMINATING phase', () => {
    // Add two players
    playerManager.add('socket-1', 'P1', true);
    playerManager.add('socket-2', 'P2', false);
    
    // Initialize lives to 1
    playerManager.getAll().forEach((p) => {
      p.lives = 1;
      p.isAlive = true;
    });

    gameLoop.start();
    
    // 1. STARTING -> DANCING (4000ms)
    vi.advanceTimersByTime(4100);
    
    // 2. DANCING -> ANNOUNCING (15000ms)
    vi.advanceTimersByTime(15100);
    
    // Let's mock player 1 standing on winning tile, and player 2 standing on wrong tile
    const winnerColor = (gameLoop as any)._pendingWinner;
    const loserColor = winnerColor === 'RED' ? 'BLUE' : 'RED';
    
    const p1 = playerManager.get('socket-1')!;
    const p2 = playerManager.get('socket-2')!;
    p1.position = { x: 1, z: 1 };
    p2.position = { x: 0, z: 0 };
    
    // Manually force tile colors in GridManager's grid
    const grid = (gridManager as any).grid;
    grid[0][0].color = loserColor;
    grid[0][0].isActive = true;
    grid[1][1].color = winnerColor;
    grid[1][1].isActive = true;
    
    // 3. ANNOUNCING -> ELIMINATING (10000ms)
    vi.advanceTimersByTime(10100);
    
    expect(gameLoop.getPhase()).toBe('ELIMINATING');
    
    // 4. ELIMINATING -> GAME_OVER (ELIMINATING duration is 2000ms)
    vi.advanceTimersByTime(2100);
    
    expect(gameLoop.getPhase()).toBe('GAME_OVER');
    expect(callbacks.onGameOver).toHaveBeenCalledWith('socket-1', 'P1');
  });
});
