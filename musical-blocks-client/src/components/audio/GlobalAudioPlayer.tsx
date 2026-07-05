'use client';

import { useGameAudio } from '@/src/hooks/useAudio';

export function GlobalAudioPlayer() {
  useGameAudio();
  return null;
}
