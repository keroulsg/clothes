import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
  return (
    <div className="space-y-3 w-full animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={clsx('bg-slate-200 dark:bg-slate-800/60 rounded-lg h-5 w-full', className)}
        />
      ))}
    </div>
  );
};
