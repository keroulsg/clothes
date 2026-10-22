import React from 'react';
import { Lock, FileText, RefreshCw, Cookie, Award, AlertCircle } from 'lucide-react';
import type { Language } from '../../../types';

interface LegalPageProps {
  lang: Language;
  onNavigate?: (page: string) => void;
  onOpenRegister?: () => void;
}

export const PrivacyPage: React.FC<LegalPageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
              {isAr ? 'سياسة الخصوصية وأمان البيانات' : 'Privacy Policy & Data Security'}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {isAr ? 'آخر تحديث: أكتوبر 2026 • متوافقة مع قانون حماية البيانات الشخصية رقم 151 ومعايير GDPR' : 'Last Updated: October 2026 • Compliant with Law 151 and GDPR Principles'}
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{isAr ? 'إشعار الخصوصية الصارم للمصانع:' : 'Strict Factory Privacy Notice:'}</span>{' '}
            {isAr
              ? 'تعتبر بيانات الإنتاج، شجرة المواد (BOM)، أسماء الموردين، كميات الأقمشة، وأسعار التشغيل ملكاً حصرياً ومطلقاً للمصنع المستأجر. تلتزم المنظومة بعدم استخدامها أو مشاركتها أو معالجتها إلا لغرض تشغيل النظام.'
              : 'Production runs, BOM trees, supplier identities, fabric meters, and costing records are strictly owned by the tenant factory. GarmentOS never sells or shares tenant operational data.'}
          </div>
        </div>

        <div className="prose dark:prose-invert text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. التزام عزل المستأجرين (Tenant Isolation Guarantee)</h2>
            <p>
              تطبق منظومة GarmentOS Cloud عزل برمجيات صارم (Multi-Tenant Architecture) حيث يتم تشفير وفصل قواعد بيانات وحسابات كل مصنع بشكل مستقل من خلال معرّف المستأجر (`tenant_id`) المقيد بمستوى النواة (Kernel Scope). لا يمكن لأي مستخدم من مصنع آخر أو ورشة منافسة الاطلاع على أوامر القص أو أسعار التوريد الخاصة بمصنعكم.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. نوعية البيانات التي نجمعها</h2>
            <ul className="list-disc pr-5 rtl:pr-5 ltr:pl-5 space-y-1">
              <li><strong>بيانات المصنع الإدارية:</strong> الاسم التجاري، السجل التجاري (إن وجد)، عنوان صالة القص، البريد الإلكتروني للمسؤول، وأرقام الهواتف للتواصل والدعم.</li>
              <li><strong>البيانات التشغيلية:</strong> أوامر الشغل، كود الموديل والباركود، مخططات الفرش، أوزان الـ GSM، وأرصدة الأقمشة المسجلة داخل النظام.</li>
              <li><strong>بيانات تسجيل الدخول والأمان:</strong> عناوين الـ IP، سجلات الدخول (Access Logs)، والتوقيعات الزمنية لتدقيق العمليات ومنع التلاعب.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">3. التشفير والحماية التقنية</h2>
            <p>
              يتم تشفير كافة الاتصالات بين أجهزة صالة القص وخوادم السحابة عبر بروتوكول TLS 1.3 المعتمد، كما يتم تشفير كلمات المرور والرموز السرية باستخدام خوارزمية Bcrypt القوية، وتُحفظ النسخ الاحتياطية المشفرة في مراكز بيانات مؤمنة جغرافياً.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">4. حقوق المصنع في استرداد أو حذف بياناته</h2>
            <p>
              يحق لمالك المصنع في أي وقت طلب تصدير كامل بياناته بصيغة Excel / JSON، أو طلب إتلاف وسحق سجلات مصنعه بالكامل فور انتهاء العلاقة التعاقدية وفقاً للإجراءات المعتمدة.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const TermsPage: React.FC<LegalPageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
              {isAr ? 'شروط وأحكام الاستخدام والاشتراك' : 'Terms of Service'}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {isAr ? 'اتفاقية ترخيص الاستخدام السحابي (SaaS Agreement) • سارية للمصانع والورش' : 'Cloud SaaS Licensing Agreement • Effective for all industrial tenants'}
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. طبيعة الخدمة والترخيص</h2>
            <p>
              تقدم منصة GarmentOS Cloud خدمة اشتراك سحابية لإدارة مصانع وورش الملابس. يُمنح المشترك ترخيصاً غير حصري وغير قابل للتحويل لاستخدام البرمجيات وفقاً للباقة المختارة (Starter / Professional / Enterprise).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. مسؤوليات المصنع المستأجر</h2>
            <p>
              يلتزم العميل بالحفاظ على سرية بيانات الدخول الخاصة بمستخدميه (مدير الإنتاج، المحاسب، مراقب الجودة)، ويكون مسؤولاً مسؤولية كاملة عن أي عمليات إدخال أو تعديل تتم باستخدام حسابات مصنعه.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">3. ضمان الجاهزية التشغيلية (SLA)</h2>
            <p>
              تلتزم إدارة GarmentOS Cloud بنسبة جاهزية لا تقل عن 99.5% شهرياً للأنظمة السحابية، مع جدولة أعمال الصيانة الدورية خارج أوقات ورديات التشغيل الرسمية وإشعار العملاء مسبقاً.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">4. الاستخدام غير المشروع</h2>
            <p>
              يحظر محاولة فك الشفرات البرمجية للمنظومة، أو شن هجمات حرمان من الخدمة، أو استخدام حسابات وهمية للتحايل على قيود الباقات أو تجاوز عدد المستخدمين المصرح به.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const RefundPage: React.FC<LegalPageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
              {isAr ? 'سياسة الإلغاء واسترداد الاشتراكات' : 'Refund & Cancellation Policy'}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {isAr ? 'إجراءات واضحة وعادلة لإلغاء وتعديل باقات الاشتراك' : 'Clear and fair terms for cancellation and refund requests'}
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. الفترة التجريبية المجانية (14 يوماً)</h2>
            <p>
              تتيح GarmentOS فترة تجريبية مجانية لمدة 14 يوماً بدون أي رسوم أو التزام مالي لتمكين إدارة المصنع من فحص واختبار كافة وحدات صالة القص والمخازن عملياً قبل دفع أي مبلغ.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. حق الإلغاء الفوري</h2>
            <p>
              يحق للعميل إلغاء اشتراكه الشهري أو السنوي في أي وقت من خلال لوحة إدارة الحساب أو التواصل مع فريق الدعم، ويسري الإلغاء عند انتهاء دورة الفوترة المدفوعة الحالية.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">3. شروط استرداد المبالغ</h2>
            <p>
              في حال تم تجديد الاشتراك السنوي بالخطأ، يحق للعميل طلب استرداد كامل المبلغ خلال 7 أيام من تاريخ التجديد شريطة عدم استهلاك موارد سحابية استثنائية. يتم معالجة طلبات الاسترداد المعتمدة عبر نفس وسيلة الدفع الأصلية خلال 7 إلى 14 يوم عمل.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const CookiesPage: React.FC<LegalPageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
              {isAr ? 'سياسة ملفات الارتباط والتخزين المحلي' : 'Cookie & Storage Policy'}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {isAr ? 'استخدام ملفات الارتباط وLocalStorage لأغراض الأمان والتشغيل فقط' : 'Strict use of local storage solely for session authentication and user preferences'}
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. التخزين المحلي الضروري (Essential Storage)</h2>
            <p>
              تستخدم المنظومة تقنية `localStorage` لتخزين الرموز الأمنية المعتمدة (`garmentos_auth_token`) ومعرّف المستأجر الحالي لتأكيد الصلاحيات وحماية الجلسة من التزييف، بالإضافة لحفظ خيارات الواجهة مثل الوضع الداكن واللغة وحالة طي القائمة الجانبية.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. عدم استخدام ملفات تتبع إعلانية (No Ad-Trackers)</h2>
            <p>
              نؤكد بوضوح أن GarmentOS Cloud خالية تماماً من ملفات تعريف الارتباط الإعلانية التابعة لشركات التسويق أو شبكات الإعلانات الخارجية، ولا يتم تتبع نشاط العميل خارج نطاق تطبيق الـ ERP.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const IpPage: React.FC<LegalPageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
              {isAr ? 'بيان الملكية الفكرية وخصوصية التصاميم' : 'Intellectual Property & Design Rights'}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {isAr ? 'حماية الملكية البرمجية للمنظومة والملكية الحصرية لتصاميم وباترونات العميل' : 'Software IP protection & tenant design ownership guarantee'}
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. حقوق الملكية الفكرية للمنظومة</h2>
            <p>
              تعتبر الشيفرة البرمجية (Source Code)، الخوارزميات الحسابية لهندسة صالات القص وتوليد حزم الباركود، التصاميم البصرية، والعلامات التجارية لـ GarmentOS ملكية فكرية حصرية لمالك المنظومة، ومحمية بالقوانين المحلية والدولية للملكية الفكرية.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. الملكية الحصرية لتصاميم العميل وباترونات الموديلات</h2>
            <p>
              يحتفظ المصنع المستأجر بكامل حقوق الملكية الفكرية والتجارية لكافة الباترونات، جداول المقاسات، أسماء الموديلات، صور العينات، وعقود التصنيع التي يرفعها إلى حسابه. لا تكتسب المنظومة أي حق أو ترخيص على تلك التصاميم وتعتبرها أسراراً صناعية وتجارية مشددة الحماية.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
