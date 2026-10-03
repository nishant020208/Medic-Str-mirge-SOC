import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'aesthetic';

const THEME_STORAGE_KEY = 'medistore_theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  try {
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme') as ThemeMode | null;
    if (urlTheme === 'light' || urlTheme === 'dark' || urlTheme === 'aesthetic') {
      return urlTheme;
    }

    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'aesthetic') {
      return saved;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }

  return 'light';
}

function applyThemeToDOM(theme: ThemeMode) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (bg) {
      metaThemeColor.setAttribute('content', bg);
    }
  }
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const initialTheme = getInitialTheme();
  applyThemeToDOM(initialTheme);

  // Sync cross-tab changes
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as ThemeMode;
        if (newTheme === 'light' || newTheme === 'dark' || newTheme === 'aesthetic') {
          applyThemeToDOM(newTheme);
          set({ theme: newTheme });
        }
      }
    });
  }

  return {
    theme: initialTheme,
    setTheme: (theme: ThemeMode) => {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Storage failover
      }
      applyThemeToDOM(theme);
      set({ theme });
    },
    cycleTheme: () => {
      const current = get().theme;
      const next: ThemeMode =
        current === 'light' ? 'dark' : current === 'dark' ? 'aesthetic' : 'light';
      get().setTheme(next);
    },
  };
});
