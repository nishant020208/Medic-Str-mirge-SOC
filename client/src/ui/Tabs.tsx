import React from 'react';
import { cn } from '../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      role="tablist"
      className={cn(
        'flex border-b border-marble-300 dark:border-lapis-700/80 gap-2 overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'min-h-[44px] px-4 py-2.5 font-cinzel text-xs uppercase tracking-wider font-semibold border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gold-500 rounded-t-sm',
              isActive
                ? 'border-gold-500 text-gold-600 dark:text-gold-400 bg-gold-500/5'
                : 'border-transparent text-ink-700 dark:text-marble-300 hover:text-ink-950 dark:hover:text-marble-100 hover:border-marble-400'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] rounded-full',
                  isActive
                    ? 'bg-gold-500 text-ink-950 font-bold'
                    : 'bg-marble-200 dark:bg-lapis-800 text-ink-700 dark:text-marble-300'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
