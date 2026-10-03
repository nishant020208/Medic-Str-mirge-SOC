import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from '../ui/Toast';
import { ClickSpark } from './reactbits/ClickSpark';
import { Silk } from './reactbits/Silk';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

export const Layout: React.FC = () => {
  const location = useLocation();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ClickSpark>
      <div className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-gold-500 selection:text-ink-950 font-sans">
        {/* Skip to Content for Accessibility / WCAG AA */}
        <a href="#main-content" className="skip-to-content sr-only focus:not-sr-only">
          Skip to main temple sanctuary
        </a>

        {/* Ambient Silk animated background */}
        <Silk />

        {/* Navigation Bar */}
        <Navbar />

        {/* Main Routed Content */}
        <main id="main-content" className="flex-grow flex flex-col focus:outline-none" tabIndex={-1}>
          <Outlet />
        </main>

        {/* Global Toast System */}
        <ToastContainer />

        {/* Footer */}
        <Footer />
      </div>
    </ClickSpark>
  );
};
