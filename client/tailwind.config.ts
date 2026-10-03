import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        marble: {
          50: '#FCFAF7',
          100: '#F5F1E8',
          200: '#E8DFD0',
          300: '#D9CBB5',
          DEFAULT: '#F5F1E8',
        },
        lapis: {
          950: '#060F26',
          900: '#0B1F4B',
          800: '#142C66',
          700: '#1D3B82',
          600: '#2A4FA3',
          DEFAULT: '#0B1F4B',
        },
        gold: {
          300: '#E5C866',
          400: '#D4B33E',
          500: '#C9A227',
          600: '#A68218',
          DEFAULT: '#C9A227',
        },
        terracotta: {
          400: '#CC6A46',
          500: '#B5532F',
          600: '#943F20',
          DEFAULT: '#B5532F',
        },
        olive: {
          400: '#84964B',
          500: '#6B7A3A',
          600: '#53602A',
          DEFAULT: '#6B7A3A',
        },
        ink: {
          950: '#0C0A08',
          900: '#14110D',
          800: '#2B251E',
          700: '#4A4135',
          DEFAULT: '#14110D',
        },
        temple: {
          border: 'var(--color-border)',
          card: 'var(--color-card)',
          bg: 'var(--color-bg)',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
          accent: 'var(--color-accent)',
        }
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(201, 162, 39, 0.3)',
        'gold-glow-lg': '0 0 45px -5px rgba(201, 162, 39, 0.45)',
        'lapis-glow': '0 0 30px -5px rgba(11, 31, 75, 0.5)',
      },
      backgroundImage: {
        'marble-pattern': "linear-gradient(135deg, rgba(245,241,232,0.95) 0%, rgba(232,223,208,0.9) 100%)",
        'lapis-radial': "radial-gradient(circle at 50% 30%, #142C66 0%, #0B1F4B 70%, #060F26 100%)",
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
} satisfies Config;
