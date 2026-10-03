import { create } from 'zustand';
import { useTheme, ThemeMode } from './themeStore';

interface UIState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  isCartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  get theme() {
    return useTheme.getState().theme;
  },
  toggleTheme: () => {
    useTheme.getState().cycleTheme();
    set({ theme: useTheme.getState().theme });
  },
  setTheme: (theme: ThemeMode) => {
    useTheme.getState().setTheme(theme);
    set({ theme });
  },
  isCartDrawerOpen: false,
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
}));

export { useTheme };
export type { ThemeMode };
