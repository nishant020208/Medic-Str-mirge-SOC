import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Replace default colors completely with semantic theme tokens only
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      'surface-2': 'var(--surface-2)',
      'surface-glass': 'var(--surface-glass)',
      border: 'var(--border)',
      text: 'var(--text)',
      'text-muted': 'var(--text-muted)',
      'text-on-primary': 'var(--text-on-primary)',
      primary: 'var(--primary)',
      'primary-hover': 'var(--primary-hover)',
      accent: 'var(--accent)',
      'accent-text': 'var(--accent-text)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      info: 'var(--info)',
      ring: 'var(--ring)',
      overlay: 'var(--overlay)',
      'chart-1': 'var(--chart-1)',
      'chart-2': 'var(--chart-2)',
      'chart-3': 'var(--chart-3)',
      'chart-4': 'var(--chart-4)',
      'chart-5': 'var(--chart-5)',
      'chart-6': 'var(--chart-6)',
    },
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        theme: 'var(--shadow)',
        glow: 'var(--glow)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
