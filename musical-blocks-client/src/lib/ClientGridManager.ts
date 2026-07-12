import {
  BlockColor,
  GameBlock,
  GridPosition,
  GRID_SIZE,
  COLOR_HEX,
  SuddenDeathMode,
} from '@/src/shared/types';

const ALL_COLORS = Object.keys(COLOR_HEX) as BlockColor[];

export class ClientGridManager {
  private grid: GameBlock[][];
  private deadBlocks = new Set<string>();
  private maxColors = 6;
  private suddenDeathMode: SuddenDeathMode = 'NORMAL';

  private lastGeneratedRound = 0;

  constructor() {
    this.grid = this.buildEmpty();
  }

  setMaxColors(count: number): void {
    this.maxColors = count;
  }

  getMaxColors(): number {
    return this.maxColors;
  }

  setSuddenDeathMode(mode: SuddenDeathMode): void {
    this.suddenDeathMode = mode;
  }

  generate(round: number = 1): GameBlock[][] {
    const isSkip = round > 1 && round !== this.lastGeneratedRound + 1;
    this.lastGeneratedRound = round;

    if (round <= 1) {
      this.deadBlocks.clear();
    } else if (isSkip && this.deadBlocks.size === 0) {
      // Pre-populate dead blocks for skip-testing
      let targetDeadCount = 0;
      if (this.suddenDeathMode === 'NORMAL') {
        if (round >= 10) targetDeadCount = Math.min(20, round - 9);
      } else if (this.suddenDeathMode === 'CHAOS') {
        if (round >= 11) {
          targetDeadCount = Math.min(30, 10 + (round - 10) * 2);
        } else if (round > 0) {
          targetDeadCount = Math.min(10, round);
        }
      }

      while (this.deadBlocks.size < targetDeadCount) {
        const aliveCoords: string[] = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const key = `${r},${c}`;
            if (!this.deadBlocks.has(key)) aliveCoords.push(key);
          }
        }
        if (aliveCoords.length === 0) break;
        const killMe = aliveCoords[Math.floor(Math.random() * aliveCoords.length)];
        this.deadBlocks.add(killMe);
      }
    }

    let blocksToKill = 0;
    if (this.suddenDeathMode === 'NORMAL') {
      if (round >= 10 && this.deadBlocks.size < 20) {
        blocksToKill = 1;
      }
    } else if (this.suddenDeathMode === 'CHAOS') {
      if (this.deadBlocks.size < 30) {
        if (round >= 11) {
          blocksToKill = Math.min(2, 30 - this.deadBlocks.size);
        } else {
          blocksToKill = 1;
        }
      }
    }

    for (let i = 0; i < blocksToKill; i++) {
      const aliveCoords: string[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const key = `${r},${c}`;
          if (!this.deadBlocks.has(key)) aliveCoords.push(key);
        }
      }
      if (aliveCoords.length > 0) {
        const killMe = aliveCoords[Math.floor(Math.random() * aliveCoords.length)];
        this.deadBlocks.add(killMe);
      }
    }

    const availableColors = ALL_COLORS.slice(0, this.maxColors);
    const greyPct = round >= 40 ? Math.min(0.5, (round - 40) * 0.01 + 0.1) : 0;

    this.grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const isDead = this.deadBlocks.has(`${row},${col}`);
        const isGrey = !isDead && Math.random() < greyPct;
        this.grid[row][col] = {
          row,
          col,
          color: availableColors[Math.floor(Math.random() * availableColors.length)],
          isActive: !isDead,
          isDead,
          isGrey,
        };
      }
    }
    return this.getSnapshot();
  }

  eliminate(winnerColor: BlockColor): Array<{ row: number; col: number }> {
    const eliminated: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const b = this.grid[row][col];
        if (b.isActive && (b.color !== winnerColor || b.isGrey)) {
          b.isActive = false;
          eliminated.push({ row, col });
        }
      }
    }
    return eliminated;
  }

  getColorDistribution(): Record<BlockColor, number> {
    const dist = {} as Record<BlockColor, number>;
    for (const color of ALL_COLORS) dist[color] = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const b = this.grid[row][col];
        if (b.isActive && !b.isGrey) dist[b.color]++;
      }
    }
    return dist;
  }

  pickWinnerColor(): BlockColor {
    const dist = this.getColorDistribution();
    const available = ALL_COLORS.filter(c => dist[c] > 0);
    
    if (available.length === 0) {
      const activeBlocks: GameBlock[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const b = this.grid[r][c];
          if (b.isActive) activeBlocks.push(b);
        }
      }
      if (activeBlocks.length > 0) {
        const luckyBlock = activeBlocks[Math.floor(Math.random() * activeBlocks.length)];
        luckyBlock.isGrey = false;
        return luckyBlock.color;
      }
      return ALL_COLORS[0];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  isBlockActive(pos: GridPosition): boolean {
    if (!this.isInBounds(pos)) return false;
    return this.grid[pos.z][pos.x].isActive;
  }

  isBlockDead(pos: GridPosition): boolean {
    if (!this.isInBounds(pos)) return false;
    return this.grid[pos.z][pos.x].isDead === true;
  }

  getValidSpawnPositions(): GridPosition[] {
    const valid: GridPosition[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!this.deadBlocks.has(`${row},${col}`)) {
          valid.push({ x: col, z: row });
        }
      }
    }
    return valid;
  }

  isInBounds(pos: GridPosition): boolean {
    return pos.x >= 0 && pos.x < GRID_SIZE && pos.z >= 0 && pos.z < GRID_SIZE;
  }

  getSnapshot(): GameBlock[][] {
    return this.grid.map(row => row.map(b => ({ ...b })));
  }

  private buildEmpty(): GameBlock[][] {
    const grid: GameBlock[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        grid[row][col] = { row, col, color: 'RED', isActive: true };
      }
    }
    return grid;
  }
}