import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl p-4 sm:p-5 shadow-xs dark:shadow-md transition-all duration-200',
        hover && 'hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-[rgba(79,12,22,0.14)] hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
