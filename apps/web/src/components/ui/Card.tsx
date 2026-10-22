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
      'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-xs',
    elevated:
      'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-md shadow-slate-900/5 dark:shadow-black/20',
    glass:
      'bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-xs',
    burgundy:
      'bg-gradient-to-br from-[#7F1625] via-[#500c17] to-[#120306] text-white border border-white/15 shadow-lg shadow-[#7F1625]/20',
    outline:
      'bg-transparent border border-[var(--border-strong)] text-[var(--text-primary)]',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-200 min-w-0 max-w-full',
        variantStyles[variant],
        hover && 'hover:border-[#7F1625]/40 dark:hover:border-[#9E2A3B]/50 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
