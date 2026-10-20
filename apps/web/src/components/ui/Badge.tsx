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
  success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold',
  info: 'bg-sky-500/10 text-sky-700 border-sky-500/20 font-bold',
  danger: 'bg-rose-500/10 text-rose-700 border-rose-500/20 font-bold',
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200 font-semibold',
  purple: 'bg-purple-500/10 text-purple-700 border-purple-500/20 font-bold',
  brand: 'bg-[#7F1625]/10 text-[#7F1625] border-[#7F1625]/25 font-bold',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  danger: 'bg-rose-500',
  neutral: 'bg-zinc-400',
  purple: 'bg-purple-500',
  brand: 'bg-[#7F1625]',
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
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border transition-all',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      {children}
    </span>
  );
};
