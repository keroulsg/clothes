import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md transition-all duration-200',
        hover && 'hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
