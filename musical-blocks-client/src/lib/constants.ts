// Re-export shared constants + add client-only visual constants
export {
  GRID_SIZE,
  MAX_PLAYERS,
  BLOCK_SIZE,
  COLOR_HEX,
  PLAYER_COLORS,
  ROUND_DURATIONS,
  LAG_TOLERANCE_MS,
  MOVE_RATE_LIMIT_MS,
} from '@/src/shared/types';

// Camera
export const CAMERA_POSITION: [number, number, number] = [0, 18, 14];
export const CAMERA_FOV = 50;

// Block visuals
export const BLOCK_HEIGHT = 0.28; // slightly flat voxel
export const BLOCK_GAP = 0.05;    // gap between adjacent blocks

// Animation
export const FALL_SPEED = 8;      // units/s falling eliminated blocks
export const LERP_SPEED = 10;     // player interpolation per-frame factor

// Server URL (Next.js env var)
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001';
