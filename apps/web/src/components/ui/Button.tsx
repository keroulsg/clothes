import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'accent' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-light)] hover:opacity-95 text-white shadow-xs border border-[var(--brand-border)] font-bold hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700',
    outline:
      'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] font-semibold dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-[var(--brand-primary)] dark:hover:text-[#F87171]',
    accent:
      'bg-[var(--brand-subtle)] border border-[var(--brand-border)] text-[var(--brand-primary)] hover:opacity-90 font-bold dark:text-[#F87171]',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-bold border border-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-600',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-bold border border-rose-600 dark:bg-rose-700 dark:hover:bg-rose-600',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-950 font-semibold dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  };

  const sizes = {
    xs: 'text-[11px] px-2.5 py-1 gap-1 rounded-lg font-medium',
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg font-medium',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2 rounded-xl font-bold',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5 rounded-xl font-black',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading ? 'true' : undefined}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : icon ? (
        <span className="shrink-0 flex items-center justify-center" aria-hidden="true">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
};
