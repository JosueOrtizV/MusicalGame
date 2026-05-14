import { useGameStore } from '@/src/stores/gameStore';
import { en } from '@/src/locales/en';
import { es } from '@/src/locales/es';

const dictionaries = {
  en,
  es,
};

export type DictKey = keyof typeof en;

export function useTranslation() {
  const lang = useGameStore((s) => s.language);
  const dict = dictionaries[lang] || dictionaries.en;

  // Simple string replacer (e.g., "Room #{id}" => "Room #123")
  const t = (key: DictKey, params?: Record<string, string | number>) => {
    let str = dict[key] || en[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return { t, lang };
}
