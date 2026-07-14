'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useGameStore } from '@/src/stores/gameStore';
import { useSocket } from '@/src/hooks/useSocket';

const emptySubscribe = (callback: () => void) => {
  return useGameStore.persist.onFinishHydration(callback);
};

export function HtmlLangSync() {
  const language = useGameStore((s) => s.language);
  const hasSetLanguage = useGameStore((s) => s.hasSetLanguage);
  
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => useGameStore.persist.hasHydrated(),
    () => false
  );

  useSocket();

  useEffect(() => {
    if (hydrated && !hasSetLanguage) {
      const browserLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
      const defaultLang = browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
      useGameStore.getState().setLanguage(defaultLang);
    }
  }, [hydrated, hasSetLanguage]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  return null;
}
