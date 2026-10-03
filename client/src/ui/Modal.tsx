import React, { useEffect } from 'react';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'relative w-full max-w-lg bg-[#FAF7F0] dark:bg-lapis-900 border border-gold-500/40 rounded-sm shadow-2xl overflow-hidden text-ink-900 dark:text-marble-100 p-6 max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-marble-300 dark:border-lapis-700/60 pb-3 mb-4">
          {title && (
            <h3 className="font-cinzel text-lg font-bold text-ink-950 dark:text-gold-300 tracking-wider">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-ink-700 dark:text-marble-300 hover:text-gold-600 dark:hover:text-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
