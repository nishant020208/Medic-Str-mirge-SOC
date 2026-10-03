import React from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'marble' | 'papyrus' | 'lapis' | 'glass';
  hasBorder?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'marble', hasBorder = true, children, ...props }, ref) => {
    const variants = {
      marble: 'bg-surface text-text shadow-theme backdrop-blur-sm floating-card',
      papyrus: 'bg-surface-2 text-text shadow-theme floating-card',
      lapis: 'bg-surface-2 text-text shadow-theme floating-card',
      glass: 'bg-surface-glass backdrop-blur-md text-text shadow-theme floating-card',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-card p-6 relative overflow-hidden transition-all duration-300',
          hasBorder && 'border border-border hover:border-accent/60',
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
