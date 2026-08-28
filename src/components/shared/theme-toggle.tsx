'use client';

import { Moon, Sun } from '@phosphor-icons/react';
import { useSyncExternalStore } from 'react';

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    (onChange) => {
      window.addEventListener('lof-theme-change', onChange);
      return () => window.removeEventListener('lof-theme-change', onChange);
    },
    () => document.documentElement.dataset.theme === 'dark',
    () => false,
  );

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('lof-theme', next);
    window.dispatchEvent(new Event('lof-theme-change'));
  }

  return (
    <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Activar modo ${isDark ? 'claro' : 'oscuro'}`}>
      {isDark ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
    </button>
  );
}
