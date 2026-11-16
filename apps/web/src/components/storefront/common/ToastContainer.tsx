import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, isAr } = useStorefrontCommerce();

  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed bottom-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none ${
        isAr ? 'left-0' : 'right-0'
      }`}
    >
      {toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white border-slate-700';
        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

        if (toast.type === 'success') {
          bg = 'bg-emerald-950 text-emerald-100 border-emerald-700';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-950 text-amber-100 border-amber-700';
          icon = <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-rose-950 text-rose-100 border-rose-700';
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${bg}`}
          >
            <div className="flex items-center gap-3">
              {icon}
              <p className="text-sm font-medium leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
