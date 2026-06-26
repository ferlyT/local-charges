import React from 'react';
import { useThemeStore } from '../stores/themeStore';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex items-center gap-1 p-1 bg-neutral rounded-md border border-secondary/20">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-sm transition-all ${
          theme === 'light' 
            ? 'bg-surface shadow-sm text-tertiary' 
            : 'text-secondary hover:text-primary hover:bg-secondary/10'
        }`}
        title="Light Mode"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-sm transition-all ${
          theme === 'system' 
            ? 'bg-surface shadow-sm text-tertiary' 
            : 'text-secondary hover:text-primary hover:bg-secondary/10'
        }`}
        title="System Preference"
      >
        <Monitor size={16} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-sm transition-all ${
          theme === 'dark' 
            ? 'bg-surface shadow-sm text-tertiary' 
            : 'text-secondary hover:text-primary hover:bg-secondary/10'
        }`}
        title="Dark Mode"
      >
        <Moon size={16} />
      </button>
    </div>
  );
}
