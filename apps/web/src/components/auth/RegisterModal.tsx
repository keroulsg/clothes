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
  isAr?: boolean;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPlanTier = 'starter',
  onSwitchToLogin,
  isAr = true,
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
      setErrorMessage(isAr ? 'تأكيد كلمة المرور غير متطابق.' : 'Password confirmation does not match.');
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
      setErrorMessage(err.message || (isAr ? 'حدث خطأ أثناء تسجيل المصنع. يرجى مراجعة البيانات.' : 'Error registering company. Please review your details.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <CModal visible={isOpen} onClose={onClose} size="lg" alignment="center">
      <CModalHeader closeButton>
        <CModalTitle className="d-flex align-items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <span>{isAr ? 'تسجيل مصنع جديد — GarmentOS Cloud' : 'Register New Factory — GarmentOS Cloud'}</span>
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="p-4">
        <div className="mb-4 p-3 rounded-3 bg-primary/10 border border-primary/20 d-flex align-items-start gap-2">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-1" />
          <div className="small text-slate-800 dark:text-slate-200 font-medium">
            {isAr
              ? 'أنشئ حساب مصنعك خلال دقيقة واحدة واحصل على تجربة مجانية تشمل إدارة كاملة للقص، أوامر الإنتاج، المخزون، والتشغيل للغير (CMT).'
              : 'Create your factory account in 1 minute with a free trial including cutting, production orders, inventory, and CMT subcontracting.'}
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
                {isAr ? 'اسم المصنع / الشركة *' : 'Factory / Company Name *'}
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="text"
                  placeholder={isAr ? 'مثال: مصنع النيل للملابس' : 'e.g. Nile Garments Factory'}
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
                {isAr ? 'نطاق المصنع المخصص (Subdomain)' : 'Custom Subdomain'}
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
                {isAr ? 'اسم المالك / المدير المسؤول *' : 'Owner / Manager Name *'}
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="text"
                  placeholder={isAr ? 'الاسم الثلاثي' : 'Full Name'}
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
                {isAr ? 'البريد الإلكتروني للعمل *' : 'Work Email *'}
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
                {isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}
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
                {isAr ? 'باقة الاشتراك المبدئية' : 'Initial Subscription Plan'}
              </label>
              <CFormSelect
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value)}
                disabled={loading}
              >
                <option value="starter">{isAr ? 'باقة الورش والمشاغل (Starter)' : 'Small Workshop (Starter)'}</option>
                <option value="professional">{isAr ? 'باقة المصانع المتوسطة (Professional)' : 'Mid-size Factory (Professional)'}</option>
                <option value="enterprise">{isAr ? 'باقة خطوط الإنتاج الكبرى (Enterprise)' : 'Large Enterprise (Enterprise)'}</option>
              </CFormSelect>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-bold text-slate-900 dark:text-slate-200">
                {isAr ? 'كلمة المرور *' : 'Password *'}
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="password"
                  placeholder={isAr ? '8 أحرف على الأقل' : 'At least 8 characters'}
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
                {isAr ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
              </label>
              <div className="input-group">
                <span className="input-group-text bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                  <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </span>
                <CFormInput
                  type="password"
                  placeholder={isAr ? 'إعادة إدخال كلمة المرور' : 'Re-enter password'}
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
              {isAr ? 'لديك حساب مصنع بالفعل؟ ' : 'Already have a factory account? '}
              {onSwitchToLogin && (
                <button
                  type="button"
                  className="btn btn-link p-0 text-primary dark:text-[#fca5a5] text-decoration-none fw-semibold"
                  onClick={() => {
                    onClose();
                    onSwitchToLogin();
                  }}
                >
                  {isAr ? 'تسجيل الدخول' : 'Sign In'}
                </button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-end">
              <CButton color="secondary" variant="ghost" onClick={onClose} disabled={loading}>
                {isAr ? 'إلغاء' : 'Cancel'}
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
                    <span>{isAr ? 'جارِ إنشاء المصنع...' : 'Creating Factory...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد التسجيل وبدء التشغيل' : 'Register & Start'}</span>
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
