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
        'flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-card bg-surface/50',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-accent mb-4 shadow-inner">
        {icon || <Sparkles className="w-6 h-6" />}
      </div>
      <h4 className="font-cinzel text-lg font-bold text-text mb-2">
        {title}
      </h4>
      <p className="text-text-muted max-w-sm mb-5 font-cormorant text-base">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
