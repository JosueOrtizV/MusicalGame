'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSocket, serverNow } from '@/src/lib/socketClient';
import { useGameStore, selectPhase } from '@/src/stores/gameStore';
import { Direction } from '@/src/shared/types';
import { MOVE_RATE_LIMIT_MS } from '@/src/lib/constants';

// Maps keyboard keys to cardinal directions
const KEY_MAP: Record<string, 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'> = {
  ArrowUp: 'UP', w: 'UP', W: 'UP',
  ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
};

/**
 * Combines currently pressed directions and rotates them relative to the camera yaw.
 * Maps the rotated continuous direction to one of the 8 discrete grid directions.
 */
export function computeDirection(
  pressed: Record<'UP' | 'DOWN' | 'LEFT' | 'RIGHT', boolean>,
  cameraYaw: number
): Direction | null {
  const up = pressed.UP;
  const down = pressed.DOWN;
  const left = pressed.LEFT;
  const right = pressed.RIGHT;
  
  // Resolve opposing inputs in camera space
  // W is forward (+1), S is backward (-1)
  const V = up && !down ? 1 : down && !up ? -1 : 0;
  // D is right (+1), A is left (-1)
  const H = right && !left ? 1 : left && !right ? -1 : 0;

  if (V === 0 && H === 0) return null;

  // Project vertical and horizontal screen coordinates using cameraYaw
  const sin = Math.sin(cameraYaw);
  const cos = Math.cos(cameraYaw);

  // camForward = (-sin, -cos) on the XZ grid plane
  // camRight = (cos, -sin) on the XZ grid plane
  const dx = V * (-sin) + H * cos;
  const dz = V * (-cos) + H * (-sin);

  // Map 2D vector (dx, dz) to one of the 8 discrete sectors (45 degrees each)
  const angle = Math.atan2(dz, dx);
  const deg = (angle * 180) / Math.PI;

  if (deg >= -22.5 && deg < 22.5) return 'RIGHT';
  if (deg >= 22.5 && deg < 67.5) return 'DOWN_RIGHT';
  if (deg >= 67.5 && deg < 112.5) return 'DOWN';
  if (deg >= 112.5 && deg < 157.5) return 'DOWN_LEFT';
  if (deg >= 157.5 || deg < -157.5) return 'LEFT';
  if (deg >= -157.5 && deg < -112.5) return 'UP_LEFT';
  if (deg >= -112.5 && deg < -67.5) return 'UP';
  if (deg >= -67.5 && deg < -22.5) return 'UP_RIGHT';

  return null;
}

// ---------------------------------------------------------------------------
//  usePlayerInput — listens to keyboard inputs and emits player:move in a loop
// ---------------------------------------------------------------------------
export function usePlayerInput() {
  const phase = useGameStore(selectPhase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const lastEmitTimeRef = useRef(0);
  const lastDirectionRef = useRef<Direction | null>(null);
  const isRepeatingRef = useRef(false);

  // Directly emit a direction (primarily used for Dash or legacy D-Pad calls)
  const emit = useCallback(
    (direction: Direction) => {
      if (phase !== 'DANCING' && phase !== 'ANNOUNCING') return;
      const gameMode = useGameStore.getState().gameMode;
      
      const isAlive = gameMode === 'singleplayer'
        ? useGameStore.getState().gameState?.players[0]?.isAlive
        : (localPlayerId ? useGameStore.getState().gameState?.players.find(p => p.id === localPlayerId)?.isAlive : false);
      if (!isAlive) return;

      lastEmitTimeRef.current = performance.now(); // delay auto-repeat tick
      isRepeatingRef.current = false;

      if (gameMode === 'singleplayer') {
        window.dispatchEvent(new CustomEvent('sp:move', { detail: { direction } }));
      } else {
        if (!localPlayerId) return;
        getSocket().emit('player:move', { direction, timestamp: serverNow() });
      }
    },
    [phase, localPlayerId],
  );

  // Continuous movement check loop using requestAnimationFrame
  useEffect(() => {
    let animFrameId: number;
    
    const tick = () => {
      if (phase !== 'DANCING' && phase !== 'ANNOUNCING') {
        animFrameId = requestAnimationFrame(tick);
        return;
      }
      const gameMode = useGameStore.getState().gameMode;
      if (gameMode !== 'singleplayer' && !localPlayerId) {
        animFrameId = requestAnimationFrame(tick);
        return;
      }
      
      const pressed = useGameStore.getState().pressedDirections;
      const cameraYaw = useGameStore.getState().cameraYaw;
      const dir = computeDirection(pressed, cameraYaw);
      
      if (dir) {
        const now = performance.now();
        const isNewDirection = dir !== lastDirectionRef.current;
        lastDirectionRef.current = dir;

        if (isNewDirection || lastEmitTimeRef.current === 0) {
          // Instant response for first step or direction change
          const isAlive = gameMode === 'singleplayer'
            ? useGameStore.getState().gameState?.players[0]?.isAlive
            : (localPlayerId ? useGameStore.getState().gameState?.players.find(p => p.id === localPlayerId)?.isAlive : false);
          if (isAlive) {
            lastEmitTimeRef.current = now;
            isRepeatingRef.current = false;
            if (gameMode === 'singleplayer') {
              window.dispatchEvent(new CustomEvent('sp:move', { detail: { direction: dir } }));
            } else {
              getSocket().emit('player:move', { direction: dir, timestamp: serverNow() });
            }
          }
        } else {
          // Check repeat delays
          const elapsed = now - lastEmitTimeRef.current;
          const requiredDelay = isRepeatingRef.current ? MOVE_RATE_LIMIT_MS : 180; // 180ms initial repeat delay
          
          if (elapsed >= requiredDelay) {
            const isAlive = gameMode === 'singleplayer'
              ? useGameStore.getState().gameState?.players[0]?.isAlive
              : (localPlayerId ? useGameStore.getState().gameState?.players.find(p => p.id === localPlayerId)?.isAlive : false);
            if (isAlive) {
              lastEmitTimeRef.current = now;
              isRepeatingRef.current = true;
              if (gameMode === 'singleplayer') {
                window.dispatchEvent(new CustomEvent('sp:move', { detail: { direction: dir } }));
              } else {
                getSocket().emit('player:move', { direction: dir, timestamp: serverNow() });
              }
            }
          }
        }
      } else {
        // Reset emit timer when no keys are pressed so the next initial movement triggers instantly
        lastEmitTimeRef.current = 0;
        lastDirectionRef.current = null;
        isRepeatingRef.current = false;
      }
      
      animFrameId = requestAnimationFrame(tick);
    };
    
    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [phase, localPlayerId]);

  // Listen for keyboard events to update store state
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
         target.tagName === 'TEXTAREA' ||
         target.isContentEditable)
      ) {
        return;
      }

      // Spacebar for Dash
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        
        // Enforce 5-second visual cooldown (shared with mobile DashButton)
        const dashCooldownEnd = useGameStore.getState().dashCooldownEnd;
        if (Date.now() < dashCooldownEnd) return;
        
        const pressed = useGameStore.getState().pressedDirections;
        const cameraYaw = useGameStore.getState().cameraYaw;
        let baseDir = computeDirection(pressed, cameraYaw);
        if (!baseDir) {
          baseDir = computeDirection({ UP: true, DOWN: false, LEFT: false, RIGHT: false }, cameraYaw) || 'UP';
        }
        const dashDir = `DASH_${baseDir}` as Direction;
        useGameStore.getState().triggerDashCooldown();
        emit(dashDir);
        return;
      }

      const dir = KEY_MAP[e.key];
      if (!dir) return;

      // Prevent scrolling but allow F12, Ctrl+R, etc.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
      }

      useGameStore.getState().setDirectionPressed(dir, true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
         target.tagName === 'TEXTAREA' ||
         target.isContentEditable)
      ) {
        return;
      }

      const dir = KEY_MAP[e.key];
      if (!dir) return;
      useGameStore.getState().setDirectionPressed(dir, false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [emit]);

  return { emit };
}
