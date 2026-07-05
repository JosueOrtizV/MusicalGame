import {
  Direction,
  GridPosition,
  GRID_SIZE,
  MOVE_RATE_LIMIT_MS,
  DASH_COOLDOWN_MS,
} from '@/src/shared/types';
import { ClientGridManager } from './ClientGridManager';

export function applyDirection(pos: GridPosition, dir: Direction): GridPosition {
  const deltas: Record<Direction, GridPosition> = {
    UP:    { x: 0,  z: -1 },
    DOWN:  { x: 0,  z: 1  },
    LEFT:  { x: -1, z: 0  },
    RIGHT: { x: 1,  z: 0  },
    UP_LEFT:    { x: -1, z: -1 },
    UP_RIGHT:   { x: 1,  z: -1 },
    DOWN_LEFT:  { x: -1, z: 1  },
    DOWN_RIGHT: { x: 1,  z: 1  },
    DASH_UP:    { x: 0,  z: -2 },
    DASH_DOWN:  { x: 0,  z: 2  },
    DASH_LEFT:  { x: -2, z: 0  },
    DASH_RIGHT: { x: 2,  z: 0  },
    DASH_UP_LEFT:    { x: -2, z: -2 },
    DASH_UP_RIGHT:   { x: 2,  z: -2 },
    DASH_DOWN_LEFT:  { x: -2, z: 2  },
    DASH_DOWN_RIGHT: { x: 2,  z: 2  },
  };
  const d = deltas[dir];
  return { x: pos.x + d.x, z: pos.z + d.z };
}

export function isInBounds(pos: GridPosition): boolean {
  return pos.x >= 0 && pos.x < GRID_SIZE && pos.z >= 0 && pos.z < GRID_SIZE;
}

export class ClientPlayerController {
  private position: GridPosition = { x: 5, z: 5 };
  private lastMoveTime = 0;
  private lastDashTime = 0;

  getPosition(): GridPosition {
    return this.position;
  }

  setPosition(pos: GridPosition): void {
    this.position = { ...pos };
  }

  validateAndMove(
    direction: Direction,
    grid: ClientGridManager
  ): GridPosition | null {
    const isDash = direction.startsWith('DASH_');
    const now = performance.now();

    // Move rate limit
    if (!isDash) {
      const elapsed = now - this.lastMoveTime;
      if (elapsed < MOVE_RATE_LIMIT_MS) return null;
    } else {
      // Dash cooldown limit
      const elapsedDash = now - this.lastDashTime;
      if (elapsedDash < DASH_COOLDOWN_MS) return null;
    }

    const destination = applyDirection(this.position, direction);

    if (isDash) {
      const baseDir = direction.replace('DASH_', '') as Direction;
      const intermediate = applyDirection(this.position, baseDir);
      
      if (!isInBounds(intermediate) || grid.isBlockDead(intermediate)) return null;
      if (!isInBounds(destination) || grid.isBlockDead(destination)) return null;
      
      this.lastDashTime = now;
    } else {
      if (!isInBounds(destination) || grid.isBlockDead(destination)) return null;
    }

    this.position = destination;
    this.lastMoveTime = now;
    return this.position;
  }
}