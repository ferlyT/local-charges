import React from 'react';
import { useLanguageStore } from '../stores/languageStore';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className="flex items-center bg-neutral/60 border border-secondary/20 rounded-full p-0.5 gap-0.5">
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 text-[0.7rem] font-bold rounded-full transition-all duration-200 ${
          language === 'en'
            ? 'bg-tertiary text-white shadow-sm'
            : 'text-secondary hover:text-primary'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('id')}
        className={`px-2.5 py-1 text-[0.7rem] font-bold rounded-full transition-all duration-200 ${
          language === 'id'
            ? 'bg-tertiary text-white shadow-sm'
            : 'text-secondary hover:text-primary'
        }`}
      >
        ID
      </button>
    </div>
  );
}
