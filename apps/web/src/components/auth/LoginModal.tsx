import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api, type ApiUser, type ApiTenant } from '../../api/client';
import { Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess: (user: ApiUser, tenant?: ApiTenant | null) => void;
  onClose?: () => void;
  isClosable?: boolean;
  onSwitchToRegister?: () => void;
  isAr?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  isClosable = false,
  onSwitchToRegister,
  isAr = true,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' : 'Please enter your work email and password.');
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
      setErrorMessage(err.message || (isAr ? 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات.' : 'Login failed. Please verify your credentials.'));
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
      title={isAr ? 'تسجيل الدخول إلى GarmentOS Cloud' : 'Sign In to GarmentOS Cloud'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="p-3.5 rounded-2xl border flex items-start gap-3"
          style={{
            backgroundColor: 'rgba(70, 8, 9, 0.08)',
            borderColor: 'rgba(70, 8, 9, 0.25)',
          }}
        >
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {isAr
              ? 'منظومة إدارة مصانع الملابس المتكاملة مع عزل مستأجرين آمن (Tenant Isolation) وحماية معتمدة للعمليات والمخزون.'
              : 'Complete garment ERP with secure multi-tenant isolation and verified inventory safeguards.'}
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
            {isAr ? 'البريد الإلكتروني للعمل' : 'Work Email'}
          </label>
          <div className="relative">
            <Mail className={`w-4 h-4 text-slate-500 dark:text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@factory.com"
              required
              disabled={loading}
              className={`w-full ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-slate-50 dark:bg-[#111726] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] disabled:opacity-50 transition-colors`}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
            {isAr ? 'كلمة المرور' : 'Password'}
          </label>
          <div className="relative">
            <Lock className={`w-4 h-4 text-slate-500 dark:text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className={`w-full ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-slate-50 dark:bg-[#111726] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] disabled:opacity-50 transition-colors`}
            />
          </div>
        </div>

        {/* Quick Demo Credentials Box */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <span>{isAr ? 'حسابات الاختبار التجريبية (اضغط للتعبئة الفورية):' : 'Demo Test Accounts (Click to Auto-fill):'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setEmail('qa_nile.owner@garmentos.test');
                setPassword('Password123!@#');
              }}
              className={`p-1.5 ${isAr ? 'text-right' : 'text-left'} rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[var(--brand-primary)] transition-colors cursor-pointer`}
            >
              <div className="font-bold text-[var(--brand-primary)] dark:text-[#f87171] text-[11px]">{isAr ? 'مالك المصنع' : 'Factory Owner'}</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">qa_nile.owner</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@garmentos.com');
                setPassword('password123');
              }}
              className={`p-1.5 ${isAr ? 'text-right' : 'text-left'} rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[var(--brand-primary)] transition-colors cursor-pointer`}
            >
              <div className="font-bold text-slate-800 dark:text-white text-[11px]">{isAr ? 'مشرف المنصة' : 'Platform Admin'}</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">admin@garmentos</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('qa_nile.prod@garmentos.test');
                setPassword('Password123!@#');
              }}
              className={`p-1.5 ${isAr ? 'text-right' : 'text-left'} rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[var(--brand-primary)] transition-colors cursor-pointer`}
            >
              <div className="font-bold text-blue-700 dark:text-blue-400 text-[11px]">{isAr ? 'مهندس الإنتاج' : 'Production Eng'}</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">qa_nile.prod</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('qa_nile.stock@garmentos.test');
                setPassword('Password123!@#');
              }}
              className={`p-1.5 ${isAr ? 'text-right' : 'text-left'} rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[var(--brand-primary)] transition-colors cursor-pointer`}
            >
              <div className="font-bold text-amber-700 dark:text-amber-400 text-[11px]">{isAr ? 'أمين المخزن' : 'Storekeeper'}</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">qa_nile.stock</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('qa_nile.acct@garmentos.test');
                setPassword('Password123!@#');
              }}
              className={`p-1.5 ${isAr ? 'text-right' : 'text-left'} rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[var(--brand-primary)] transition-colors cursor-pointer`}
            >
              <div className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">{isAr ? 'المحاسب المالي' : 'Accountant'}</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">qa_nile.acct</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('qa_nile.qc@garmentos.test');
                setPassword('Password123!@#');
              }}
              className={`p-1.5 ${isAr ? 'text-right' : 'text-left'} rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[var(--brand-primary)] transition-colors cursor-pointer`}
            >
              <div className="font-bold text-purple-700 dark:text-purple-400 text-[11px]">{isAr ? 'مفتش الجودة QC' : 'QC Inspector'}</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">qa_nile.qc</div>
            </button>
          </div>
        </div>

        {onSwitchToRegister && (
          <div className="text-center pt-1">
            <button
              type="button"
              className="text-xs text-[var(--brand-primary)] hover:underline font-semibold transition-colors"
              onClick={() => {
                if (onClose) onClose();
                onSwitchToRegister();
              }}
            >
              {isAr ? 'ليس لديك حساب مصنع؟ سجل مصنعك الآن وابدأ التجربة' : "Don't have an account? Register your factory now."}
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
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? (isAr ? 'جارِ التحقق والمصادقة...' : 'Authenticating...') : (isAr ? 'دخول إلى النظام' : 'Sign In')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
