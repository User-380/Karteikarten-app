export type Theme = 'system' | 'light' | 'dark';

const KEY = 'theme';

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch {
    /* localStorage nicht verfügbar */
  }
  return 'system';
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* egal */
  }
  applyTheme(theme);
}
