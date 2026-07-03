export {
  GRID_SIZE,
  MAX_PLAYERS,
  BLOCK_SIZE,
  COLOR_HEX,
  PLAYER_COLORS,
  ROUND_DURATIONS,
  LAG_TOLERANCE_MS,
  MOVE_RATE_LIMIT_MS,
  DASH_COOLDOWN_MS,
  DASH_DISTANCE,
} from '@/src/shared/types';

// Camera follow mode (game phase)
export const FOLLOW_CAM_OFFSET: [number, number, number] = [0, 8, 7];  // closer & lower
export const FOLLOW_CAM_FOV = 55;              // wider FOV for immersion
export const FOLLOW_CAM_LERP = 0.08;           // smooth follow speed
export const FOLLOW_CAM_LOOK_AHEAD = 1.5;      // look ahead in movement direction

// Camera orbit limits
export const ORBIT_MIN_POLAR = Math.PI * 0.15;  // min vertical angle
export const ORBIT_MAX_POLAR = Math.PI * 0.45;  // max vertical angle  
export const ORBIT_MIN_DIST = 6;                // min zoom
export const ORBIT_MAX_DIST = 26;               // max zoom

// Camera default/starting
export const CAMERA_POSITION: [number, number, number] = [0, 18, 14];
export const CAMERA_FOV = 50;

// Block visuals
export const BLOCK_HEIGHT = 0.28; // slightly flat voxel
export const BLOCK_GAP = 0.05;    // gap between adjacent blocks

// Animation
export const FALL_SPEED = 8;      // units/s falling eliminated blocks
export const LERP_SPEED = 12;     // player interpolation per-frame factor

// Server URL (Next.js env var)
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001';
