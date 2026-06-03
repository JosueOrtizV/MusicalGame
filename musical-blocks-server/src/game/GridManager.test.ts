import { describe, test, expect, beforeEach } from 'vitest';
import { GridManager } from './GridManager';
import { GRID_SIZE } from '@shared/types';

describe('GridManager', () => {
  let gridManager: GridManager;

  beforeEach(() => {
    gridManager = new GridManager();
  });

  test('constructor should initialize an empty grid', () => {
    const grid = gridManager.getSnapshot();
    expect(grid.length).toBe(GRID_SIZE);
    expect(grid[0].length).toBe(GRID_SIZE);
  });

  test('generate should create a 12x12 grid with correct properties', () => {
    const grid = gridManager.generate(1);
    expect(grid.length).toBe(GRID_SIZE);
    expect(grid[0].length).toBe(GRID_SIZE);
    expect(grid[0][0]).toHaveProperty('row');
    expect(grid[0][0]).toHaveProperty('col');
    expect(grid[0][0]).toHaveProperty('color');
    expect(grid[0][0]).toHaveProperty('isActive', true);
  });

  test('setMaxColors should restrict generated color choices', () => {
    gridManager.setMaxColors(4); // Easy
    const grid = gridManager.generate(1);
    const colorsUsed = new Set(grid.flat().map((b) => b.color));
    
    // Max 4 colors should be present
    expect(colorsUsed.size).toBeLessThanOrEqual(4);
  });

  test('eliminate should turn off blocks of wrong colors', () => {
    const grid = gridManager.generate(1);
    const winnerColor = gridManager.pickWinnerColor();
    
    const eliminated = gridManager.eliminate(winnerColor);
    const snapshot = gridManager.getSnapshot();
    
    snapshot.flat().forEach((block) => {
      if (block.color === winnerColor) {
        expect(block.isActive).toBe(true);
      } else {
        expect(block.isActive).toBe(false);
      }
    });

    expect(eliminated.length).toBeGreaterThan(0);
  });

  test('suddenDeathMode NORMAL should start killing blocks at round 10', () => {
    gridManager.setSuddenDeathMode('NORMAL');
    
    // Round < 10: 0 dead blocks
    gridManager.generate(9);
    let deadCount = gridManager.getSnapshot().flat().filter((b) => b.isDead).length;
    expect(deadCount).toBe(0);

    // Round 10: 1 dead block
    gridManager.generate(10);
    deadCount = gridManager.getSnapshot().flat().filter((b) => b.isDead).length;
    expect(deadCount).toBe(1);
  });

  test('suddenDeathMode CHAOS should start killing blocks from round 1', () => {
    gridManager.setSuddenDeathMode('CHAOS');
    
    // Round 1: 1 dead block
    gridManager.generate(1);
    let deadCount = gridManager.getSnapshot().flat().filter((b) => b.isDead).length;
    expect(deadCount).toBe(1);

    // Round 11: 2 blocks killed per round
    // Call generate sequentially to accumulate dead blocks
    for (let r = 2; r <= 10; r++) {
      gridManager.generate(r); // Round 2 to 10 kill 1 block each (total 1 + 9 = 10)
    }
    gridManager.generate(11); // Round 11 kills 2 blocks (total 10 + 2 = 12)
    deadCount = gridManager.getSnapshot().flat().filter((b) => b.isDead).length;
    expect(deadCount).toBe(12);
  });
});
