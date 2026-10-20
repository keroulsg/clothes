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
    default: 'bg-white border border-slate-200/90 text-slate-900 shadow-xs',
    elevated: 'bg-white border border-slate-200 text-slate-900 shadow-md shadow-slate-900/5',
    glass: 'bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-900 shadow-sm',
    burgundy: 'bg-gradient-to-br from-[#7F1625] via-[#500c17] to-[#120306] text-white border border-white/15 shadow-lg shadow-[#7F1625]/20',
    outline: 'bg-transparent border border-slate-300 text-slate-900',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-200',
        variantStyles[variant],
        hover && 'hover:border-[#7F1625]/40 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
