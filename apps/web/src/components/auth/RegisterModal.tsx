import React, { useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CForm,
  CFormInput,
  CFormSelect,
  CButton,
  CAlert,
  CSpinner,
} from '@coreui/react';
import { api, type ApiUser, type ApiTenant } from '../../api/client';
import { Building2, User, Mail, Lock, Phone, Sparkles, CheckCircle2 } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: ApiUser, tenant: ApiTenant) => void;
  initialPlanTier?: string;
  onSwitchToLogin?: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPlanTier = 'starter',
  onSwitchToLogin,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [planTier, setPlanTier] = useState(initialPlanTier);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (password !== passwordConfirmation) {
      setErrorMessage('تأكيد كلمة المرور غير متطابق.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.auth.registerCompany({
        company_name: companyName.trim(),
        subdomain: subdomain.trim().toLowerCase() || undefined,
        owner_name: ownerName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        plan_tier: planTier,
      });

      onSuccess(res.user, res.tenant);
      onClose();
    } catch (err: any) {
      if (err.errors) {
        setFieldErrors(err.errors);
      }
      setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل المصنع. يرجى مراجعة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CModal visible={isOpen} onClose={onClose} size="lg" alignment="center">
      <CModalHeader closeButton>
        <CModalTitle className="d-flex align-items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <span>تسجيل مصنع جديد — GarmentOS Cloud</span>
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="p-4">
        <div className="mb-4 p-3 rounded-3 bg-primary/10 border border-primary/20 d-flex align-items-start gap-2">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-1" />
          <div className="small text-slate-800 dark:text-slate-200 font-medium">
            أنشئ حساب مصنعك خلال دقيقة واحدة واحصل على تجربة مجانية تشمل إدارة كاملة للقص، أوامر الإنتاج، المخزون، والتشغيل للغير (CMT).
          </div>
        </div>

        {errorMessage && (
          <CAlert color="danger" className="d-flex align-items-center gap-2 small">
            <div>{errorMessage}</div>
          </CAlert>
        )}

        <CForm onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                اسم المصنع / الشركة *
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="text"
                  placeholder="مثال: مصنع النيل للملابس"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (!subdomain) {
                      setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  required
                  disabled={loading}
                />
              </div>
              {fieldErrors.company_name && (
                <div className="text-danger small mt-1">{fieldErrors.company_name[0]}</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                نطاق المصنع المخصص (Subdomain)
              </label>
              <div className="input-group" dir="ltr">
                <CFormInput
                  type="text"
                  placeholder="nile-garments"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={loading}
                />
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 small text-slate-700 dark:text-slate-300">
                  .garmentos.cloud
                </span>
              </div>
              {fieldErrors.subdomain && (
                <div className="text-danger small mt-1">{fieldErrors.subdomain[0]}</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                اسم المالك / المدير المسؤول *
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="text"
                  placeholder="الاسم الثلاثي"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {fieldErrors.owner_name && (
                <div className="text-danger small mt-1">{fieldErrors.owner_name[0]}</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                البريد الإلكتروني للعمل *
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <Mail className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="email"
                  placeholder="owner@factory.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <div className="text-danger small mt-1">{fieldErrors.email[0]}</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                رقم الهاتف / واتساب
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <Phone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="tel"
                  placeholder="+20 100 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              {fieldErrors.phone && (
                <div className="text-danger small mt-1">{fieldErrors.phone[0]}</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                باقة الاشتراك المبدئية
              </label>
              <CFormSelect
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value)}
                disabled={loading}
              >
                <option value="starter">باقة الورش والمشاغل (Starter)</option>
                <option value="professional">باقة المصانع المتوسطة (Professional)</option>
                <option value="enterprise">باقة خطوط الإنتاج الكبرى (Enterprise)</option>
              </CFormSelect>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                كلمة المرور *
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="password"
                  placeholder="8 أحرف على الأقل"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>
              {fieldErrors.password && (
                <div className="text-danger small mt-1">{fieldErrors.password[0]}</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                تأكيد كلمة المرور *
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="password"
                  placeholder="إعادة إدخال كلمة المرور"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-top border-secondary d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
            <div className="small text-secondary">
              لديك حساب مصنع بالفعل؟{' '}
              {onSwitchToLogin && (
                <button
                  type="button"
                  className="btn btn-link p-0 text-primary dark:text-[#fca5a5] text-decoration-none fw-semibold"
                  onClick={() => {
                    onClose();
                    onSwitchToLogin();
                  }}
                >
                  تسجيل الدخول
                </button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-end">
              <CButton color="secondary" variant="ghost" onClick={onClose} disabled={loading}>
                إلغاء
              </CButton>
              <CButton
                type="submit"
                color="primary"
                disabled={loading}
                className="d-flex align-items-center gap-2"
                style={{ backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' }}
              >
                {loading ? (
                  <>
                    <CSpinner size="sm" />
                    <span>جارِ إنشاء المصنع...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد التسجيل وبدء التشغيل</span>
                  </>
                )}
              </CButton>
            </div>
          </div>
        </CForm>
      </CModalBody>
    </CModal>
  );
};
