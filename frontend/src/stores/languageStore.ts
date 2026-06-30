import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'id';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'id', // default bahasa Indonesia
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'language-storage',
    }
  )
);
