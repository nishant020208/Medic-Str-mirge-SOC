import React from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'success', message, title }),
  error: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'error', message, title }),
  info: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'info', message, title }),
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-sm border shadow-lg transition-all duration-300 transform translate-y-0',
            t.type === 'success' &&
              'bg-[#F2F8F2] dark:bg-[#0E241B] border-olive-500/40 text-olive-900 dark:text-olive-200',
            t.type === 'error' &&
              'bg-[#FDF2F2] dark:bg-[#2A1215] border-terracotta-500/40 text-terracotta-900 dark:text-terracotta-200',
            t.type === 'info' &&
              'bg-[#F0F4FC] dark:bg-lapis-900 border-gold-500/40 text-lapis-950 dark:text-marble-100'
          )}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-olive-600 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-terracotta-600 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />}

          <div className="flex-1 text-sm">
            {t.title && <h5 className="font-cinzel font-bold text-xs uppercase tracking-wider mb-0.5">{t.title}</h5>}
            <p>{t.message}</p>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
