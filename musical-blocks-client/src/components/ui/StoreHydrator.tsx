'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/src/stores/gameStore';

export function StoreHydrator() {
  useEffect(() => {
    useGameStore.persist.rehydrate();
  }, []);

  return null;
}
