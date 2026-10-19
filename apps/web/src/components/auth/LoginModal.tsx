import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api, type ApiUser, type ApiTenant } from '../../api/client';
import { Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess: (user: ApiUser, tenant: ApiTenant) => void;
  onClose?: () => void;
  isClosable?: boolean;
  onSwitchToRegister?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  isClosable = false,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.auth.login({
        email: email.trim(),
        password,
      });

      onSuccess(res.user, res.tenant);
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (isClosable && onClose) {
          onClose();
        }
      }}
      title="تسجيل الدخول إلى GarmentOS Cloud"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="p-3.5 rounded-2xl border flex items-start gap-3"
          style={{
            backgroundColor: 'rgba(79, 12, 22, 0.08)',
            borderColor: 'rgba(79, 12, 22, 0.25)',
          }}
        >
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            منظومة إدارة مصانع الملابس المتكاملة مع عزل مستأجرين آمن (Tenant Isolation) وحماية معتمدة للعمليات والمخزون.
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
            البريد الإلكتروني للعمل
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@factory.com"
              required
              disabled={loading}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-[#111726] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] disabled:opacity-50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
            كلمة المرور
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-[#111726] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] disabled:opacity-50 transition-colors"
            />
          </div>
        </div>

        {onSwitchToRegister && (
          <div className="text-center pt-1">
            <button
              type="button"
              className="text-xs text-primary dark:text-[#fca5a5] hover:underline font-semibold transition-colors"
              onClick={() => {
                if (onClose) onClose();
                onSwitchToRegister();
              }}
            >
              ليس لديك حساب مصنع؟ سجل مصنعك الآن وابدأ التجربة
            </button>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between gap-3">
          {isClosable && onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              إلغاء
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? 'جارِ التحقق والمصادقة...' : 'دخول إلى النظام'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
