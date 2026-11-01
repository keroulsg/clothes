import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isAr?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  isAr = true,
}) => {
  const displayTitle = title ?? (isAr ? 'حدث خطأ في جلب البيانات' : 'Failed to load data');

  return (
    <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-rose-500/20 bg-rose-500/5 my-4">
      <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 mb-3 border border-rose-500/20">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-1">{displayTitle}</h4>
      <p className="text-xs text-rose-600 dark:text-rose-400 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          {isAr ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      )}
    </div>
  );
};
