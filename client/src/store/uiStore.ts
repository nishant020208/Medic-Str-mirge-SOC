import { create } from 'zustand';

interface UIState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  isCartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme:
    typeof window !== 'undefined' &&
    (localStorage.getItem('medistore_theme') as 'dark' | 'light')
      ? (localStorage.getItem('medistore_theme') as 'dark' | 'light')
      : 'dark', // Default to night temple mode for aesthetic impact
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('medistore_theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: nextTheme };
    }),
  setTheme: (theme) => {
    localStorage.setItem('medistore_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  isCartDrawerOpen: false,
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
}));
