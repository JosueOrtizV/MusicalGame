import { describe, it, expect, beforeEach } from 'vitest';
import { ClientGridManager } from './ClientGridManager';

describe('ClientGridManager', () => {
  let grid: ClientGridManager;

  beforeEach(() => {
    grid = new ClientGridManager();
  });

  it('initializes grid with 12x12 active blocks', () => {
    const snapshot = grid.getSnapshot();
    expect(snapshot.length).toBe(12);
    expect(snapshot[0].length).toBe(12);
    expect(snapshot[0][0].isActive).toBe(true);
  });

  it('generates colors according to maxColors', () => {
    grid.setMaxColors(4);
    expect(grid.getMaxColors()).toBe(4);

    grid.generate(1);
    const snapshot = grid.getSnapshot();
    const colorsUsed = new Set<string>();

    for (const row of snapshot) {
      for (const block of row) {
        colorsUsed.add(block.color);
      }
    }

    expect(colorsUsed.size).toBeLessThanOrEqual(4);
  });

  it('eliminates non-winner blocks', () => {
    grid.generate(1);
    const snapshot = grid.getSnapshot();
    const winnerColor = snapshot[0][0].color;

    const eliminated = grid.eliminate(winnerColor);
    expect(eliminated.length).toBeGreaterThan(0);

    const newSnapshot = grid.getSnapshot();
    expect(newSnapshot[0][0].isActive).toBe(true); // Winner block stays active
  });

  it('picks valid winner color', () => {
    grid.generate(1);
    const winnerColor = grid.pickWinnerColor();
    expect(winnerColor).toBeDefined();
    expect(typeof winnerColor).toBe('string');
  });

  it('validates positions within bounds', () => {
    expect(grid.isInBounds({ x: 0, z: 0 })).toBe(true);
    expect(grid.isInBounds({ x: 11, z: 11 })).toBe(true);
    expect(grid.isInBounds({ x: -1, z: 0 })).toBe(false);
    expect(grid.isInBounds({ x: 12, z: 5 })).toBe(false);
  });
});
