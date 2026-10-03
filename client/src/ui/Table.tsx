import React from 'react';
import { cn } from '../lib/utils';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className="w-full overflow-x-auto rounded-sm border border-marble-300 dark:border-lapis-700/80">
    <table className={cn('w-full text-left text-sm', className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead
    className={cn(
      'bg-marble-200/60 dark:bg-lapis-950 border-b border-marble-300 dark:border-lapis-700/80 font-cinzel text-xs uppercase tracking-wider text-ink-900 dark:text-gold-300',
      className
    )}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={cn('divide-y divide-marble-200 dark:divide-lapis-800/60', className)} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => (
  <tr
    className={cn(
      'transition-colors hover:bg-gold-500/5 dark:hover:bg-lapis-800/40',
      className
    )}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <th className={cn('px-4 py-3 font-bold', className)} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <td className={cn('px-4 py-3 text-ink-800 dark:text-marble-200', className)} {...props}>
    {children}
  </td>
);
