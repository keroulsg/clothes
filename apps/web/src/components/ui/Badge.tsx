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
  success:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 font-bold',
  warning:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20 border-amber-500/20 dark:border-amber-500/30 font-bold',
  info:
    'bg-sky-500/10 text-sky-700 dark:text-sky-400 dark:bg-sky-500/20 border-sky-500/20 dark:border-sky-500/30 font-bold',
  danger:
    'bg-rose-500/10 text-rose-700 dark:text-rose-400 dark:bg-rose-500/20 border-rose-500/20 dark:border-rose-500/30 font-bold',
  neutral:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-semibold',
  purple:
    'bg-purple-500/10 text-purple-700 dark:text-purple-400 dark:bg-purple-500/20 border-purple-500/20 dark:border-purple-500/30 font-bold',
  brand:
    'bg-[#7F1625]/10 text-[#7F1625] dark:text-[#F87171] dark:bg-[#9E2A3B]/20 border-[#7F1625]/25 dark:border-[#9E2A3B]/35 font-bold',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  danger: 'bg-rose-500',
  neutral: 'bg-slate-400 dark:bg-slate-500',
  purple: 'bg-purple-500',
  brand: 'bg-[#7F1625] dark:bg-[#F87171]',
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
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-sans border transition-all select-none',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      {children}
    </span>
  );
};
