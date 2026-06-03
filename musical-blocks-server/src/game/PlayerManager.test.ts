import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlayerManager } from './PlayerManager';
import { GridManager } from './GridManager';
import { GRID_SIZE, MOVE_RATE_LIMIT_MS, LAG_TOLERANCE_MS } from '@shared/types';

describe('PlayerManager', () => {
  let playerManager: PlayerManager;
  let gridManager: GridManager;

  beforeEach(() => {
    playerManager = new PlayerManager();
    gridManager = new GridManager();
    gridManager.generate(1);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('add should create a player with unique settings', () => {
    const p1 = playerManager.add('socket-1', 'Josue', true);
    expect(p1.id).toBe('socket-1');
    expect(p1.name).toBe('Josue');
    expect(p1.isHost).toBe(true);
    expect(p1.isAlive).toBe(true);
    expect(p1.lives).toBe(0);
    expect(playerManager.count()).toBe(1);
  });

  test('remove should delete player record', () => {
    playerManager.add('socket-1', 'Josue', true);
    playerManager.remove('socket-1');
    expect(playerManager.count()).toBe(0);
    expect(playerManager.get('socket-1')).toBeUndefined();
  });

  test('validateMove should reject out of bounds', () => {
    const p1 = playerManager.add('socket-1', 'Josue', true);
    // Put player in top left corner (0, 0)
    p1.position = { x: 0, z: 0 };
    
    // UP should be invalid
    const now = Date.now();
    const isValid = playerManager.validateMove('socket-1', 'UP', now, gridManager);
    expect(isValid).toBe(false);
  });

  test('validateMove should allow valid moves', () => {
    const p1 = playerManager.add('socket-1', 'Josue', true);
    p1.position = { x: 5, z: 5 };
    
    const now = Date.now();
    const isValid = playerManager.validateMove('socket-1', 'UP', now, gridManager);
    expect(isValid).toBe(true);
  });

  test('validateMove should reject rate-limited movements', () => {
    const p1 = playerManager.add('socket-1', 'Josue', true);
    p1.position = { x: 5, z: 5 };
    
    const now = Date.now();
    let isValid = playerManager.validateMove('socket-1', 'UP', now, gridManager);
    expect(isValid).toBe(true);
    
    // Apply move to set timestamp
    playerManager.applyMove('socket-1', 'UP');
    
    // Move again instantly (0ms elapsed) -> reject
    isValid = playerManager.validateMove('socket-1', 'DOWN', now, gridManager);
    expect(isValid).toBe(false);

    // Fast-forward timers by rate limit duration
    vi.advanceTimersByTime(MOVE_RATE_LIMIT_MS + 10);
    
    // Move again -> allow
    isValid = playerManager.validateMove('socket-1', 'DOWN', Date.now(), gridManager);
    expect(isValid).toBe(true);
  });

  test('validateMove should reject extreme lag or future client timestamps', () => {
    const p1 = playerManager.add('socket-1', 'Josue', true);
    p1.position = { x: 5, z: 5 };
    
    const now = Date.now();
    
    // Reject excessive lag (past client timestamp)
    let isValid = playerManager.validateMove('socket-1', 'UP', now - (LAG_TOLERANCE_MS + 100), gridManager);
    expect(isValid).toBe(false);
    
    // Reject future client timestamp
    isValid = playerManager.validateMove('socket-1', 'UP', now + (LAG_TOLERANCE_MS + 100), gridManager);
    expect(isValid).toBe(false);
  });

  test('validateMove should handle player physical collisions if enabled', () => {
    const p1 = playerManager.add('socket-1', 'P1', true);
    const p2 = playerManager.add('socket-2', 'P2', false);
    
    p1.position = { x: 5, z: 5 };
    p2.position = { x: 5, z: 4 }; // P2 is directly UP of P1
    
    const now = Date.now();
    
    // Collisions disabled -> allow passing through
    let isValid = playerManager.validateMove('socket-1', 'UP', now, gridManager, false);
    expect(isValid).toBe(true);

    // Collisions enabled -> block
    isValid = playerManager.validateMove('socket-1', 'UP', now, gridManager, true);
    expect(isValid).toBe(false);
  });

  test('checkDeaths should kill players standing on eliminated blocks', () => {
    const p1 = playerManager.add('socket-1', 'P1', true);
    p1.position = { x: 5, z: 5 };
    p1.isAlive = true;
    p1.lives = 3;

    // Eliminate all blocks except winnerColor
    const winnerColor = gridManager.pickWinnerColor();
    
    // Ensure P1 block color is NOT winnerColor for test case
    const grid = (gridManager as any).grid;
    grid[5][5].color = winnerColor === 'RED' ? 'BLUE' : 'RED';
    
    gridManager.eliminate(winnerColor);
    
    const deaths = playerManager.checkDeaths(gridManager);
    expect(deaths).toContain('socket-1');
    expect(p1.isAlive).toBe(false);
    expect(p1.lives).toBe(2);
  });
});
