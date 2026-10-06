import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Sparkles,
  ShoppingCart,
  ShieldAlert,
  Terminal,
  User,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '../lib/utils';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const itemCount = useCartStore((s) => s.getItemCount());
  const { user, logout } = useAuthStore();

  const navItems = [
    { label: 'Temple', shortLabel: 'Temple', path: '/', icon: Home },
    { label: 'Apothecary', shortLabel: 'Shop', path: '/shop', icon: ShoppingBag },
    { label: 'Oracle', shortLabel: 'Oracle', path: '/oracle', icon: Sparkles },
    {
      label: 'Sacred Cart',
      shortLabel: 'Cart',
      path: '/cart',
      icon: ShoppingCart,
      badge: itemCount > 0 ? itemCount : undefined,
    },
    { label: 'Sanctum Quest', shortLabel: 'Quest', path: '/quest', icon: ShieldAlert },
    { label: 'Console', shortLabel: 'Console', path: '/terminal', icon: Terminal },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-surface/90 border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 group focus:outline-none focus:ring-2 focus:ring-ring rounded-card shrink-0"
          >
            <div className="w-10 h-10 rounded-card bg-primary border border-border flex items-center justify-center text-text-on-primary group-hover:scale-105 transition-transform shadow-theme shrink-0">
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
              <span className="font-cinzel font-bold text-lg sm:text-xl tracking-wider text-text block leading-tight">
                MEDISTORE
              </span>
              <span className="text-[10px] sm:text-xs font-cormorant italic tracking-widest text-accent-text hidden sm:block -mt-1 uppercase">
                Apothecary of Asclepius
              </span>
            </div>
          </Link>

          {/* Desktop Central Quick Nav */}
          <nav className="hidden lg:flex items-center gap-1 bg-surface-2 p-1.5 rounded-full border border-border shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative px-3.5 py-1.5 rounded-full text-xs font-cinzel font-semibold tracking-wider transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-ring',
                    isActive
                      ? 'bg-primary text-text-on-primary shadow-theme font-bold'
                      : 'text-text-muted hover:text-text hover:bg-surface'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                        isActive
                          ? 'bg-surface text-text'
                          : 'bg-primary text-text-on-primary'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons: Theme Switcher, Dashboard, User */}
          <div className="flex items-center gap-2">
            {/* 3-Option Segmented Control Theme Switcher */}
            <ThemeSwitcher compact className="shrink-0" />

            {/* User Session / Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === 'pharmacist' && (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-cinzel font-bold text-accent-text border border-border rounded-card hover:bg-surface-2 transition-colors shrink-0"
                    title="Pharmacist Dashboard"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                )}
                <div className="flex items-center gap-2 bg-surface-2 px-2.5 sm:px-3 py-1.5 rounded-card border border-border shadow-inner shrink-0">
                  <User className="w-3.5 h-3.5 text-accent-text shrink-0" />
                  <span className="text-xs font-medium max-w-[70px] sm:max-w-[100px] truncate text-text">
                    {user.email.split('@')[0]}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="text-danger hover:opacity-80 p-0.5 ml-0.5 sm:ml-1 transition-opacity shrink-0"
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
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-cinzel font-bold uppercase tracking-wider bg-primary hover:bg-primary-hover text-text-on-primary rounded-card transition-all shadow-theme shrink-0"
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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border shadow-theme px-1 sm:px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] flex items-center justify-around"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'min-w-[44px] min-h-[48px] flex flex-col items-center justify-center py-1 px-1.5 rounded-card text-[10px] font-cinzel transition-colors relative',
                isActive
                  ? 'text-accent-text font-bold'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[54px]">{item.shortLabel}</span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-1 sm:right-2 px-1.5 py-0.2 bg-primary text-text-on-primary font-bold text-[9px] rounded-full">
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
