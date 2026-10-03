import React from 'react';
import { cn } from '../lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Sanctum Disturbance',
  message = 'An unexpected omen has interrupted this operation. Please consult the archives again.',
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center border border-terracotta-500/30 rounded-sm bg-terracotta-500/5',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-terracotta-500/10 flex items-center justify-center text-terracotta-500 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="font-cinzel text-lg font-bold text-terracotta-600 dark:text-terracotta-400 mb-2">
        {title}
      </h4>
      <p className="text-sm text-ink-700 dark:text-marble-300 max-w-sm mb-5 font-cormorant text-base">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Invoke Again
        </Button>
      )}
    </div>
  );
};
