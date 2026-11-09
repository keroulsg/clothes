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
      'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs',
    elevated:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-md shadow-slate-900/5 dark:shadow-black/20',
    glass:
      'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs',
    burgundy:
      'bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white border border-white/15 shadow-lg shadow-blue-900/20',
    outline:
      'bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100',
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
