import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
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
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7F1625] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-gradient-to-r from-[#7F1625] to-[#941b2d] hover:from-[#6a121e] hover:to-[#7F1625] text-white shadow-sm shadow-[#7F1625]/30 border border-[#7F1625] font-bold hover:shadow-md hover:shadow-[#7F1625]/40 hover:-translate-y-0.5 active:translate-y-0',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/90 font-semibold hover:shadow-xs active:translate-y-0',
    outline:
      'bg-white border border-slate-300 hover:border-[#7F1625] hover:text-[#7F1625] text-slate-800 hover:bg-[#7F1625]/5 font-semibold shadow-2xs hover:shadow-xs',
    accent:
      'bg-[#7F1625]/10 border border-[#7F1625]/25 text-[#7F1625] hover:bg-[#7F1625]/15 font-bold hover:border-[#7F1625]/40',
    success:
      'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-sm shadow-emerald-600/30 font-bold border border-emerald-600',
    danger:
      'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-sm shadow-rose-600/30 font-bold border border-rose-600',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-950 font-semibold',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg font-medium',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2 rounded-xl font-bold',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5 rounded-xl font-black shadow-md',
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
