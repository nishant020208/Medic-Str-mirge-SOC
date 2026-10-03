import React from 'react';
import { useTheme } from '../store/themeStore';

// Static SVG Fallback adapted for Light, Dark, and Aesthetic themes
export const StaticAsclepiusHeroFallback: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div
      data-testid="static-hero-fallback"
      className="w-full h-full flex items-center justify-center relative"
    >
      <div
        className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 p-8 flex items-center justify-center shadow-glow animate-pulse-subtle ${
          theme === 'aesthetic'
            ? 'bg-surface-glass border-accent/60'
            : theme === 'dark'
            ? 'bg-surface border-primary/50'
            : 'bg-surface border-accent/40'
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          width="100"
          height="100"
          className="w-full h-full text-accent themed-illustration"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <line x1="50" y1="8" x2="50" y2="92" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="8" r="5" fill="currentColor" />
          <path
            d="M 40 84 C 25 76, 75 70, 50 52 C 25 36, 75 30, 50 18 C 45 15, 43 12, 50 12 C 57 12, 60 16, 56 22 C 50 32, 28 34, 48 54 C 70 72, 33 76, 50 88"
            strokeWidth="3.5"
            strokeLinecap="round"
            stroke="currentColor"
          />
        </svg>
      </div>
    </div>
  );
};
