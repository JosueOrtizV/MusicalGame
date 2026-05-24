'use client';

import { useEffect, useCallback } from 'react';
import { getSocket, serverNow } from '@/src/lib/socketClient';
import { useGameStore, selectPhase } from '@/src/stores/gameStore';
import { Direction } from '@/src/shared/types';

// Maps keyboard keys to directions
const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'UP', w: 'UP', W: 'UP',
  ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
};

// ---------------------------------------------------------------------------
//  usePlayerInput — listens to keyboard and emits player:move
// ---------------------------------------------------------------------------
export function usePlayerInput() {
  const phase = useGameStore(selectPhase);
  const localPlayerId = useGameStore((s) => s.localPlayerId);

  const emit = useCallback(
    (direction: Direction) => {
      if (phase !== 'DANCING' && phase !== 'ANNOUNCING') return;
      if (!localPlayerId) return;
      
      const isAlive = useGameStore.getState().gameState?.players.find(p => p.id === localPlayerId)?.isAlive;
      if (!isAlive) return;

      getSocket().emit('player:move', { direction, timestamp: serverNow() });
    },
    [phase, localPlayerId],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore game keyboard inputs if the user is writing in a text input or textarea
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

      // Prevent scrolling but allow F12, Ctrl+R, etc.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
      }

      useGameStore.getState().setDirectionPressed(dir, true);
      emit(dir);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // Ignore game keyboard inputs if the user is writing in a text input or textarea
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

  // Returns emit for virtual D-pad / mobile buttons
  return { emit };
}
