import React from 'react';
import { cn } from '../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-ink-800 dark:text-marble-200 font-cinzel"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full min-h-[44px] appearance-none px-3.5 py-2 pr-10 text-sm bg-marble-50 dark:bg-lapis-950 border border-marble-300 dark:border-lapis-700 rounded-sm text-ink-900 dark:text-marble-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-terracotta-500 focus:ring-terracotta-500',
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-700 dark:text-marble-300 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-terracotta-500 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
