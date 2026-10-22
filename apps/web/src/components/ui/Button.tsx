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
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7F1625] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-gradient-to-r from-[#7F1625] to-[#941b2d] hover:from-[#6a121e] hover:to-[#7F1625] text-white shadow-xs border border-[#7F1625] font-bold hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 dark:from-[#9E2A3B] dark:to-[#7F1625]',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700',
    outline:
      'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 hover:border-[#7F1625] hover:text-[#7F1625] font-semibold dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-[#9E2A3B] dark:hover:text-[#F87171]',
    accent:
      'bg-[#7F1625]/10 border border-[#7F1625]/25 text-[#7F1625] hover:bg-[#7F1625]/15 font-bold dark:bg-[#9E2A3B]/20 dark:text-[#F87171] dark:border-[#9E2A3B]/40',
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
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0 flex items-center justify-center">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
};
