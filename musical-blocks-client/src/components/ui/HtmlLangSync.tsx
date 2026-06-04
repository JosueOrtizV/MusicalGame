'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/src/stores/gameStore';

export function HtmlLangSync() {
  const language = useGameStore((s) => s.language);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  return null;
}
