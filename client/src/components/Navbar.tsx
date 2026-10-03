import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Sparkles,
  ShoppingCart,
  ShieldAlert,
  Terminal,
  Sun,
  Moon,
  User,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const itemCount = useCartStore((s) => s.getItemCount());
  const { theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuthStore();

  const navItems = [
    { label: 'Temple', path: '/', icon: Home },
    { label: 'Apothecary', path: '/shop', icon: ShoppingBag },
    { label: 'Oracle', path: '/oracle', icon: Sparkles },
    {
      label: 'Sacred Cart',
      path: '/cart',
      icon: ShoppingCart,
      badge: itemCount > 0 ? itemCount : undefined,
    },
    { label: 'Sanctum Quest', path: '/quest', icon: ShieldAlert },
    { label: 'Console', path: '/terminal', icon: Terminal },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-marble-100/90 dark:bg-lapis-950/85 border-b border-marble-200 dark:border-lapis-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-gold-500 rounded"
          >
            <div className="w-10 h-10 rounded-sm bg-lapis-900 dark:bg-lapis-900 border border-gold-500/50 flex items-center justify-center text-gold-400 group-hover:scale-105 transition-transform shadow-sm">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 2v20M8 6c2-1 6-1 8 0s-2 4-8 5 6 3 8 5-2 4-8 4"
                />
              </svg>
            </div>
            <div>
              <span className="font-cinzel font-bold text-lg sm:text-xl tracking-wider text-ink-950 dark:text-marble-100 block leading-tight">
                MEDISTORE
              </span>
              <span className="text-[10px] sm:text-xs font-cormorant italic tracking-widest text-gold-600 dark:text-gold-400 block -mt-1 uppercase">
                Apothecary of Asclepius
              </span>
            </div>
          </Link>

          {/* Desktop Central Quick Nav */}
          <nav className="hidden lg:flex items-center gap-1 bg-marble-200/50 dark:bg-lapis-900/60 p-1.5 rounded-full border border-marble-300 dark:border-lapis-700/60 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative px-3.5 py-1.5 rounded-full text-xs font-cinzel font-semibold tracking-wider transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-gold-500',
                    isActive
                      ? 'bg-gold-500 text-ink-950 shadow-sm font-bold'
                      : 'text-ink-800 dark:text-marble-200 hover:text-gold-600 dark:hover:text-gold-400 hover:bg-black/5 dark:hover:bg-white/5'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                        isActive
                          ? 'bg-ink-950 text-gold-400'
                          : 'bg-gold-500 text-ink-950'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons: Dashboard, User, Theme */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full border border-marble-300 dark:border-lapis-700 text-ink-800 dark:text-marble-200 hover:bg-gold-500/15 hover:text-gold-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-gold-400" />
              ) : (
                <Moon className="w-4 h-4 text-lapis-900" />
              )}
            </button>

            {/* User Session / Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === 'pharmacist' && (
                  <Link
                    to="/dashboard"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-cinzel font-bold text-gold-600 dark:text-gold-400 border border-gold-500/50 rounded-sm hover:bg-gold-500/10 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>
                )}
                <div className="flex items-center gap-2 bg-marble-200/60 dark:bg-lapis-900/60 px-3 py-1.5 rounded-sm border border-marble-300 dark:border-lapis-700">
                  <User className="w-3.5 h-3.5 text-gold-500" />
                  <span className="text-xs font-medium max-w-[100px] truncate text-ink-900 dark:text-marble-100">
                    {user.email.split('@')[0]}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="text-terracotta-500 hover:text-terracotta-600 p-0.5 ml-1"
                    title="Sign Out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-cinzel font-bold uppercase tracking-wider bg-gold-500 hover:bg-gold-600 text-ink-950 rounded-sm transition-all shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                <span>Enter</span>
              </Link>
            )}
          </div>
        </div>
        <div className="greek-key-border w-full" />
      </header>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-marble-100/95 dark:bg-lapis-950/95 backdrop-blur-lg border-t border-marble-300 dark:border-lapis-800 shadow-2xl px-2 py-1 flex items-center justify-around"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'min-w-[48px] min-h-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-sm text-[10px] font-cinzel transition-colors relative',
                isActive
                  ? 'text-gold-600 dark:text-gold-400 font-bold'
                  : 'text-ink-700 dark:text-marble-300 hover:text-gold-500'
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[60px]">{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-2 px-1.5 py-0.2 bg-gold-500 text-ink-950 font-bold text-[9px] rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
};
