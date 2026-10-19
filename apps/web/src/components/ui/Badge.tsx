import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'purple' | 'brand';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-semibold',
  warning: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30 font-semibold',
  info: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30 font-semibold',
  danger: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30 font-semibold',
  neutral: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 font-medium',
  purple: 'bg-purple-500/15 text-purple-900 dark:text-purple-300 border-purple-500/30 font-semibold',
  brand: 'bg-[#460809]/10 text-[#460809] dark:text-[#fca5a5] border-[#460809]/30 font-semibold',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  info: 'bg-sky-400',
  danger: 'bg-rose-400',
  neutral: 'bg-slate-400',
  purple: 'bg-purple-400',
  brand: 'bg-[#460809] dark:bg-[#fca5a5]',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className,
  dot = false,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm transition-all',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', dotStyles[variant])} />}
      {children}
    </span>
  );
};
