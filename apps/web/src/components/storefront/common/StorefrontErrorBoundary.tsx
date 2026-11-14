import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  isAr?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StorefrontErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Storefront rendering error caught by boundary:', error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      const isAr = this.props.isAr ?? true;
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl m-4 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isAr ? 'حدث تنبيه أثناء عرض قسم من المتجر' : 'Storefront Display Notice'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {this.props.fallbackMessage ||
                (isAr
                  ? 'تم احتواء الخطأ بأمان لمنع توقف المتجر. يمكنك إعادة تحميل هذا القسم أو تحديث الصفحة.'
                  : 'An error occurred while rendering this section. It has been safely isolated.')}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'إعادة المحاولة' : 'Try Again'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
