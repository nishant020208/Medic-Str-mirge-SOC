import React from 'react';
import { cn } from '../lib/utils';

export interface GreekDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  symbol?: boolean;
}

export const GreekDivider: React.FC<GreekDividerProps> = ({
  className,
  symbol = true,
  ...props
}) => {
  return (
    <div
      role="separator"
      className={cn('relative flex items-center justify-center my-6 py-2 select-none', className)}
      {...props}
    >
      <div className="flex-grow h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
      {symbol && (
        <div className="mx-4 flex items-center gap-1.5 text-gold-500">
          <svg className="w-4 h-4 fill-current opacity-80" viewBox="0 0 24 24">
            <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" />
          </svg>
          <span className="font-cinzel text-xs tracking-widest uppercase font-bold text-gold-600 dark:text-gold-400">
            ❖
          </span>
          <svg className="w-4 h-4 fill-current opacity-80" viewBox="0 0 24 24">
            <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" />
          </svg>
        </div>
      )}
      <div className="flex-grow h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
    </div>
  );
};
