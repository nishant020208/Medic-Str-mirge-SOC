import React from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'lapis' | 'outline' | 'ghost' | 'terracotta' | 'primary' | 'secondary' | 'danger';
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
      'inline-flex items-center justify-center font-medium uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] font-cinzel rounded-card';

    const variants: Record<string, string> = {
      gold: 'bg-primary hover:bg-primary-hover text-text-on-primary font-bold focus:ring-ring shadow-theme hover:shadow-glow border border-border',
      primary: 'bg-primary hover:bg-primary-hover text-text-on-primary font-bold focus:ring-ring shadow-theme hover:shadow-glow border border-border',
      lapis: 'bg-surface-2 hover:bg-surface text-text focus:ring-ring border border-border shadow-theme',
      secondary: 'bg-surface-2 hover:bg-surface text-text focus:ring-ring border border-border shadow-theme',
      outline: 'border-2 border-border text-accent-text hover:bg-surface-2 focus:ring-ring bg-transparent',
      ghost: 'text-text hover:bg-surface-2 hover:text-accent-text focus:ring-ring',
      terracotta: 'bg-danger hover:opacity-90 text-text-on-primary focus:ring-ring shadow-theme border border-border font-bold',
      danger: 'bg-danger hover:opacity-90 text-text-on-primary focus:ring-ring shadow-theme border border-border font-bold',
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
        className={cn(baseStyles, variants[variant] || variants.gold, sizes[size], className)}
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
