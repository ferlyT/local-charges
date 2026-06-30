import { useLanguageStore } from '../stores/languageStore';
import { translations, type TranslationKey } from '../lib/translations';

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const dict = translations[language];

  const t = (key: TranslationKey, vars?: Record<string, string | number>): string => {
    let str: string = dict[key] ?? translations.en[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return { t, language };
}
