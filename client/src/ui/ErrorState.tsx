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
        'flex flex-col items-center justify-center p-8 text-center border border-danger/40 rounded-card bg-surface shadow-theme',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-danger mb-4 shadow-inner">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="font-cinzel text-lg font-bold text-danger mb-2">
        {title}
      </h4>
      <p className="text-text-muted max-w-sm mb-5 font-cormorant text-base">
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
