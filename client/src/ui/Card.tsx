import React from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'marble' | 'papyrus' | 'lapis' | 'glass';
  hasBorder?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'marble', hasBorder = true, children, ...props }, ref) => {
    const variants = {
      marble:
        'bg-white/90 dark:bg-lapis-900/80 text-ink-900 dark:text-marble-100 shadow-sm backdrop-blur-sm',
      papyrus:
        'bg-[#FAF6EC] dark:bg-lapis-950 text-ink-900 dark:text-marble-200 shadow-md',
      lapis:
        'bg-lapis-900 dark:bg-lapis-950 text-marble-100 shadow-lg',
      glass:
        'bg-white/40 dark:bg-lapis-900/40 backdrop-blur-md text-ink-900 dark:text-marble-100 shadow-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-sm p-6 relative overflow-hidden transition-all duration-300',
          hasBorder && 'border border-marble-200 dark:border-lapis-700/80 hover:border-gold-500/50 dark:hover:border-gold-400/50',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
