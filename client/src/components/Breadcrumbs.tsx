import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem, getBreadcrumbSchema } from '../utils/seo';

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const allItems: BreadcrumbItem[] = [{ name: 'Home', url: '/' }, ...items];
  const schema = getBreadcrumbSchema(allItems);

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center space-x-1.5 text-xs text-text-muted my-3 overflow-x-auto whitespace-nowrap scrollbar-none ${className}`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        return (
          <React.Fragment key={item.url + index}>
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-border shrink-0 mx-0.5" aria-hidden="true" />
            )}
            {isLast ? (
              <span
                aria-current="page"
                className="font-cinzel font-semibold text-text truncate max-w-[200px] sm:max-w-none"
              >
                {item.name}
              </span>
            ) : (
              <Link
                to={item.url}
                className="inline-flex items-center gap-1 font-cinzel hover:text-accent-text transition-colors"
              >
                {index === 0 && <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                <span>{item.name}</span>
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
