'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/src/stores/gameStore';
import { useSocket } from '@/src/hooks/useSocket';

export function HtmlLangSync() {
  const language = useGameStore((s) => s.language);
  const hasSetLanguage = useGameStore((s) => s.hasSetLanguage);
  const [hydrated, setHydrated] = useState(false);
  
  useSocket();

  useEffect(() => {
    if (useGameStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useGameStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
      return () => unsub();
    }
  }, []);

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
