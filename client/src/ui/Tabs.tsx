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
        'flex border-b border-border gap-2 overflow-x-auto no-scrollbar',
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
              'min-h-[44px] px-4 py-2.5 font-cinzel text-xs uppercase tracking-wider font-semibold border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring rounded-t-card',
              isActive
                ? 'border-primary text-text font-bold bg-surface-2/60'
                : 'border-transparent text-text-muted hover:text-text hover:border-border'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] rounded-full',
                  isActive
                    ? 'bg-primary text-text-on-primary font-bold'
                    : 'bg-surface-2 text-text-muted'
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
