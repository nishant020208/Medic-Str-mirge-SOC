import React from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-ink-800 dark:text-marble-200 font-cinzel"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'w-full min-h-[44px] px-3.5 py-2 text-sm bg-marble-50 dark:bg-lapis-950 border border-marble-300 dark:border-lapis-700 rounded-sm text-ink-900 dark:text-marble-100 placeholder:text-ink-700/50 dark:placeholder:text-marble-200/40 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-terracotta-500 focus:ring-terracotta-500 focus:border-terracotta-500',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-terracotta-500 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-ink-700 dark:text-marble-300">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
