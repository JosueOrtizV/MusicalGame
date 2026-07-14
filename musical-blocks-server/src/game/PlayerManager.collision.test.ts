import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerManager } from './PlayerManager';
import { GridManager } from './GridManager';
import { Direction } from '@shared/types';

describe('PlayerManager Collisions', () => {
  let pm: PlayerManager;
  let grid: GridManager;

  beforeEach(() => {
    pm = new PlayerManager();
    grid = new GridManager();
  });

  it('rejects moves into occupied spaces when collisions are enabled', () => {
    const p1 = pm.add('p1', 'Player1', true);
    const p2 = pm.add('p2', 'Player2', false);
    
    // Force positions next to each other
    p1.position = { x: 5, z: 5 };
    p2.position = { x: 5, z: 6 };
    
    // P1 tries to move DOWN into P2
    const valid = pm.validateMove('p1', 'DOWN', Date.now(), grid, true);
    expect(valid).toBe(false);
    
    // Without collisions enabled, move should be valid
    const validNoCollision = pm.validateMove('p1', 'DOWN', Date.now(), grid, false);
    expect(validNoCollision).toBe(true);
  });

  it('rejects dash moves that jump over another player when collisions are enabled', () => {
    const p1 = pm.add('p1', 'Player1', true);
    const p2 = pm.add('p2', 'Player2', false);
    
    // Force positions
    p1.position = { x: 5, z: 5 };
    p2.position = { x: 5, z: 6 }; // P2 is exactly in the middle of the dash path
    
    // P1 tries to DASH_DOWN through P2 to get to (5, 7)
    // The dash should be blocked by P2 in the intermediate cell
    const valid = pm.validateMove('p1', 'DASH_DOWN', Date.now(), grid, true);
    expect(valid).toBe(false);
  });
});
