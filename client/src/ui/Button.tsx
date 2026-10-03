import React from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'lapis' | 'outline' | 'ghost' | 'terracotta';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'gold',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] font-cinzel rounded-sm';

    const variants = {
      gold: 'bg-gold-500 hover:bg-gold-600 text-ink-950 font-bold focus:ring-gold-500 shadow-sm hover:shadow-gold-glow border border-gold-400',
      lapis:
        'bg-lapis-900 hover:bg-lapis-800 text-marble-100 focus:ring-lapis-700 shadow-sm hover:shadow-lapis-glow border border-lapis-700 dark:border-gold-500/30',
      outline:
        'border-2 border-gold-500 text-gold-600 dark:text-gold-400 hover:bg-gold-500/10 focus:ring-gold-500 bg-transparent',
      ghost:
        'text-ink-800 dark:text-marble-200 hover:bg-gold-500/10 hover:text-gold-600 dark:hover:text-gold-400 focus:ring-gold-500',
      terracotta:
        'bg-terracotta-500 hover:bg-terracotta-600 text-white focus:ring-terracotta-400 shadow-sm border border-terracotta-400',
    };

    const sizes = {
      sm: 'min-h-[38px] px-3 py-1.5 text-xs gap-1.5',
      md: 'min-h-[44px] px-5 py-2.5 text-sm gap-2',
      lg: 'min-h-[50px] px-7 py-3.5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
