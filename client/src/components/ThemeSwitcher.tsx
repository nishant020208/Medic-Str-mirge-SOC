import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme, ThemeMode } from '../store/themeStore';
import { cn } from '../lib/utils';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'light', label: 'Light mode: Marble Day', icon: Sun },
  { mode: 'dark', label: 'Dark mode: Night Temple', icon: Moon },
  { mode: 'aesthetic', label: 'Aesthetic mode: Olympus Dusk', icon: Sparkles },
];

export const ThemeSwitcher: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { theme, setTheme } = useTheme();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (THEME_OPTIONS.findIndex((o) => o.mode === theme) + 1) % THEME_OPTIONS.length;
      setTheme(THEME_OPTIONS[nextIndex].mode);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (THEME_OPTIONS.findIndex((o) => o.mode === theme) - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
      setTheme(THEME_OPTIONS[prevIndex].mode);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme selector"
      className={cn(
        'inline-flex items-center bg-surface-2 p-1 rounded-full border border-border shadow-inner transition-colors duration-250',
        className
      )}
    >
      {THEME_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.mode;

        return (
          <button
            key={opt.mode}
            role="radio"
            type="button"
            aria-checked={isActive}
            aria-label={opt.label}
            onClick={() => setTheme(opt.mode)}
            onKeyDown={handleKeyDown}
            className={cn(
              'relative rounded-full transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring',
              compact ? 'p-1.5' : 'px-2.5 py-1.5 text-xs font-cinzel font-semibold gap-1.5',
              isActive
                ? 'bg-primary text-text-on-primary shadow-theme font-bold'
                : 'text-text-muted hover:text-text hover:bg-surface'
            )}
          >
            <Icon className={compact ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            {!compact && <span className="capitalize">{opt.mode}</span>}
          </button>
        );
      })}
    </div>
  );
};
