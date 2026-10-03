import React from 'react';
import { cn } from '../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-sm bg-marble-300/60 dark:bg-lapis-800/60',
        className
      )}
      {...props}
    />
  );
};
