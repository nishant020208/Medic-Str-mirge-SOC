import React from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'olive' | 'terracotta' | 'lapis' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'gold',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    gold: 'bg-gold-500/15 text-gold-700 dark:text-gold-300 border border-gold-500/30',
    olive: 'bg-olive-500/15 text-olive-700 dark:text-olive-300 border border-olive-500/30',
    terracotta: 'bg-terracotta-500/15 text-terracotta-700 dark:text-terracotta-300 border border-terracotta-500/30',
    lapis: 'bg-lapis-500/15 text-lapis-800 dark:text-lapis-200 border border-lapis-500/30',
    outline: 'border border-marble-300 dark:border-lapis-700 text-ink-800 dark:text-marble-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-wider',
    md: 'px-2.5 py-1 text-xs font-semibold tracking-wider',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm font-cinzel uppercase transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
