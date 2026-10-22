
import React from 'react';
import clsx from 'clsx';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string; onClick?: () => void }>;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 w-full min-w-0 max-w-full overflow-hidden',
        className
      )}
    >
      <div className="space-y-1 min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium overflow-x-auto pb-0.5">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
                {bc.onClick ? (
                  <button
                    onClick={bc.onClick}
                    className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    {bc.label}
                  </button>
                ) : (
                  <span
                    className={clsx(
                      'shrink-0',
                      idx === breadcrumbs.length - 1 ? 'text-slate-900 dark:text-white font-bold' : ''
                    )}
                  >
                    {bc.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-[#7F1625]/10 dark:bg-[#9E2A3B]/20 text-[#7F1625] dark:text-[#F87171] flex items-center justify-center shrink-0 border border-[#7F1625]/20 dark:border-[#9E2A3B]/30 mt-0.5 sm:mt-0">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-normal font-sans break-words">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
