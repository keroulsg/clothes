import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'glass' | 'burgundy' | 'outline';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default:
      'bg-white dark:bg-[var(--bg-card)] border border-slate-200/90 dark:border-[var(--border-subtle)] text-slate-900 dark:text-[var(--text-primary)] shadow-xs',
    elevated:
      'bg-white dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-subtle)] text-slate-900 dark:text-[var(--text-primary)] shadow-md shadow-slate-900/5 dark:shadow-black/20',
    glass:
      'bg-white/90 dark:bg-[var(--bg-surface)]/95 backdrop-blur-md border border-slate-200/80 dark:border-[var(--border-subtle)] text-slate-900 dark:text-[var(--text-primary)] shadow-xs',
    burgundy:
      'bg-gradient-to-br from-[#5C101D] via-[#7F1625] to-[#A52A3A] text-white border border-white/15 shadow-lg shadow-rose-950/20',
    outline:
      'bg-transparent border border-slate-300 dark:border-[var(--border-strong)] text-slate-900 dark:text-[var(--text-primary)]',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-200 min-w-0 max-w-full',
        variantStyles[variant],
        hover && 'hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
