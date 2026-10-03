import React from 'react';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center border border-dashed border-marble-300 dark:border-lapis-700/80 rounded-sm bg-marble-50/50 dark:bg-lapis-950/40',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500 mb-4">
        {icon || <Sparkles className="w-6 h-6" />}
      </div>
      <h4 className="font-cinzel text-lg font-bold text-ink-950 dark:text-marble-100 mb-2">
        {title}
      </h4>
      <p className="text-sm text-ink-700 dark:text-marble-300 max-w-sm mb-5 font-cormorant text-base">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
