import React from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'olive' | 'terracotta' | 'lapis' | 'outline' | 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'gold',
  size = 'md',
  children,
  ...props
}) => {
  const variants: Record<string, string> = {
    primary: 'bg-surface-2 text-accent-text border border-border font-bold',
    secondary: 'bg-surface-2 text-info border border-border font-bold',
    gold: 'bg-surface-2 text-accent-text border border-border font-bold',
    olive: 'bg-surface-2 text-success border border-border font-bold',
    success: 'bg-surface-2 text-success border border-border font-bold',
    terracotta: 'bg-surface-2 text-danger border border-border font-bold',
    danger: 'bg-surface-2 text-danger border border-border font-bold',
    warning: 'bg-surface-2 text-warning border border-border font-bold',
    lapis: 'bg-surface-2 text-info border border-border font-bold',
    info: 'bg-surface-2 text-info border border-border font-bold',
    outline: 'border border-border text-text font-medium bg-transparent',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-wider',
    md: 'px-2.5 py-1 text-xs font-semibold tracking-wider',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-card font-cinzel uppercase transition-colors',
        variants[variant] || variants.gold,
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
