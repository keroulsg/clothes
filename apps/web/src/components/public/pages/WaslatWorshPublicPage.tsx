import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Layers,
  ShieldCheck,
  Crown,
  Search,
  ArrowRight,
  ArrowLeft,
  Lock,
  Building2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  FileText,
  RefreshCw,
  Eye,
  CreditCard,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { Language } from '../../../types';
import { api } from '../../../api/client';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';

interface WaslatWorshPublicPageProps {
  lang: Language;
  onNavigate: (page: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: (tier?: 'starter' | 'professional' | 'enterprise') => void;
}

export const WaslatWorshPublicPage: React.FC<WaslatWorshPublicPageProps> = ({
  lang,
  onNavigate,
  onOpenLogin,
  onOpenRegister,
}) => {
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  // Real API State
  const [metrics, setMetrics] = useState<{
    active_rfqs_count: number;
    total_target_pieces: number;
    governorates_count: number;
    categories_count: number;
  }>({
    active_rfqs_count: 0,
    total_target_pieces: 0,
    governorates_count: 0,
    categories_count: 0,
  });

  const [rfqs, setRfqs] = useState<any[]>([]);
  const [isLoadingRfqs, setIsLoadingRfqs] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRfqs, setTotalRfqs] = useState<number>(0);

  // Detail Modal State
  const [selectedRfqDetail, setSelectedRfqDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // FAQ Accordion State
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Stage C.2 & C.3 & C.4: Independent Requester Identity & Subscriptions
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSubStatus, setUserSubStatus] = useState<any>(null);
  const [_isSubStatusLoading, setIsSubStatusLoading] = useState(false);

  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);

  // Requester Register Modal State
  const [isRequesterRegModalOpen, setIsRequesterRegModalOpen] = useState(false);
  const [regTenantName, setRegTenantName] = useState('');
  const [regBrandName, setRegBrandName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('القاهرة');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConf, setRegPasswordConf] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Payment Submission Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('ww_starter_5');
  const [paymentMethod, setPaymentMethod] = useState<'instapay' | 'bank_transfer'>('instapay');
  const [transferRef, setTransferRef] = useState('');
  const [submittedAmount, setSubmittedAmount] = useState<number>(300);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Check auth and load subscription status
  const loadUserSubscription = async () => {
    const user = api.auth.getStoredUser();
    setCurrentUser(user);
    if (!user) return;
    setIsSubStatusLoading(true);
    try {
      const statusRes = await api.waslatWorsh.getMySubscriptionStatus();
      setUserSubStatus(statusRes);
    } catch (_e) {
      setUserSubStatus(null);
    } finally {
      setIsSubStatusLoading(false);
    }
  };

  // Load available Waslat Worsh subscription packages
  const loadSubscriptionPlans = async () => {
    try {
      const res = await api.waslatWorsh.getSubscriptionPlans();
      setAvailablePlans(res.plans || []);
      setPaymentInstructions(res.payment_instructions || null);
    } catch (err) {
      console.error('Failed to load subscription plans:', err);
    }
  };

  // Load Real Metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const res = await api.waslatWorsh.getPublicMetrics();
        setMetrics(res);
      } catch (err) {
        console.error('Failed loading public metrics:', err);
      }
    };
    loadMetrics();
    loadUserSubscription();
    loadSubscriptionPlans();
  }, []);

  const handleRegisterRequesterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (regPassword !== regPasswordConf) {
      setRegError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setIsSubmittingReg(true);
    try {
      await api.auth.registerRequester({
        tenant_name: regTenantName.trim(),
        brand_name: regBrandName.trim() || undefined,
        owner_name: regOwnerName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        city: regCity.trim(),
        password: regPassword,
        password_confirmation: regPasswordConf,
      });
      setIsRequesterRegModalOpen(false);
      await loadUserSubscription();
      setIsPaymentModalOpen(true);
    } catch (err: any) {
      setRegError(err?.message || (isAr ? 'فشل إنشاء الحساب، يرجى مراجعة البيانات.' : 'Registration failed.'));
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setPaymentSuccessMsg(null);

    if (!transferRef.trim()) {
      setPaymentError(isAr ? 'يرجى إدخال رقم أو مرجع الحوالة البنكية / InstaPay' : 'Transfer reference is required');
      return;
    }
    if (!receiptFile) {
      setPaymentError(isAr ? 'يرجى إرفاق صورة إيصال السداد أو لقطة الشاشة' : 'Receipt file is required');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const fd = new FormData();
      fd.append('product_type', 'waslat_worsh');
      fd.append('plan_code', selectedPlanCode);
      fd.append('payment_method', paymentMethod);
      fd.append('transfer_reference', transferRef.trim());
      fd.append('submitted_amount', String(submittedAmount));
      fd.append('receipt', receiptFile);

      const res = await api.waslatWorsh.submitPaymentRequest(fd);
      setPaymentSuccessMsg(res.message || (isAr ? 'تم إرسال إثبات السداد بنجاح وجارِ مراجعته من الإدارة المالية' : 'Payment request submitted for review'));
      await loadUserSubscription();
      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setPaymentSuccessMsg(null);
        setReceiptFile(null);
        setReceiptPreview(null);
        setTransferRef('');
      }, 2000);
    } catch (err: any) {
      setPaymentError(err?.message || (isAr ? 'فشل إرسال إثبات السداد، يرجى المحاولة مرة أخرى.' : 'Payment submission failed'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Load Real Published RFQs
  const fetchRfqs = async () => {
    setIsLoadingRfqs(true);
    try {
      const res = await api.waslatWorsh.getPublicRfqs({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        page: currentPage,
        per_page: 9,
      });
      setRfqs(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.last_page || 1);
        setTotalRfqs(res.meta.total || 0);
      }
    } catch (err) {
      console.error('Failed fetching public RFQs:', err);
      setRfqs([]);
    } finally {
      setIsLoadingRfqs(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, [selectedCategory, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRfqs();
  };

  const handleOpenDetail = async (rfqId: string) => {
    setIsLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const res = await api.waslatWorsh.getPublicRfq(rfqId);
      setSelectedRfqDetail(res.rfq);
    } catch (err) {
      console.error('Failed to load public RFQ detail:', err);
      setSelectedRfqDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const faqs = [
    {
      q: isAr ? 'ما هي منصة "وصلة ورش" وكيف تعمل؟' : 'What is Waslat Worsh and how does it work?',
      a: isAr
        ? 'وصلة ورش هي بورصة وسوق رقمي B2B مغلق يربط مصانع الملابس الجاهزة الباحثة عن طاقات تشغيل متخصصة مع كبرى صالات القص والمشاغل المؤهلة. يطرح صاحب المصنع تفاصيل ومواصفات أمر القص، وتستقبل صالات القص المؤهلة الطلب لتقديم عروض أسعارها ومواعيد التسليم.'
        : 'Waslat Worsh is an exclusive B2B industrial capacity exchange connecting garment brand factories with verified cutting floors and production workshops.',
    },
    {
      q: isAr ? 'لماذا تقتصر المنصة حصرياً على باقة Enterprise؟' : 'Why is Waslat Worsh exclusive to Enterprise subscribers?',
      a: isAr
        ? 'لضمان أعلى معايير الجودة والموثوقية الصناعية ومنع المزايدات غير الجادة. تشترط المنصة أن يكون الطرفان (طالب الخدمة ومقدم الخدمة) مصانع وكيانات قانونية مسجلة ومفعلة باشتراك سنوي رسمي، مما يحمي سرية الباترونات وأمانات الأقمشة ومصداقية عروض الأسعار.'
        : 'To ensure industrial quality, verified business legality, and strict non-disclosure of technical patterns and fabric custody between major manufacturers.',
    },
    {
      q: isAr ? 'كيف يتم حماية سرية الباترونات والعناوين الدقيقة؟' : 'How are patterns, technical specs, and warehouse addresses protected?',
      a: isAr
        ? 'تطبق المنصة مبدأ الحجب الصارم (Strict Privacy Masking): لا تظهر في العرض العام أو لمتصفحي السوق أية عناوين دقيقة للمخازن، ولا أرقام هواتف، ولا روابط لتحميل ملفات الباترون والـ CAD. يتم فقط إعلان المحافظة والمدينة والمواصفات العامة لحساب تكلفة القص والنقل، وتُكشف العناوين فقط بعد الترسية وسداد العمولة.'
        : 'Strict privacy masking ensures exact pickup/delivery addresses, phone numbers, and downloadable CAD pattern files remain encrypted until mutual award and commission clearance.',
    },
    {
      q: isAr ? 'ما هو دور GarmentOS القانوني في عقود القص؟' : 'What is GarmentOS role and legal intermediary boundary?',
      a: isAr
        ? 'منظومة GarmentOS هي وسيط تقني وتقني فقط يوفر البورصة وحساب المسافات وتوثيق أوامر التشغيل وعزل أمانات الأقمشة محاسبياً. المنصة ليست طرفاً في عقد القص التنفيذي ولا تقوم بالقص بنفسها، وتخضع العلاقة الفنية والإنتاجية لشروط الاتفاق الصناعي المباشر بين الطرفين.'
        : 'GarmentOS operates strictly as an intermediary technology platform facilitating matchmaking, specifications exchange, and custody ledger isolation. It is not a direct party to private manufacturing contracts.',
    },
    {
      q: isAr ? 'ما هي نافذة الـ 60 دقيقة الإجبارية للعروض؟' : 'What is the mandatory 60-minute offer window?',
      a: isAr
        ? 'فور نشر طلب القص، تبدأ نافذة عد تنازلي مدتها 60 دقيقة يمنع النظام خلالها الترسية الفورية، لإتاحة فرصة عادلة ومتكافئة لكافة صالات القص المؤهلة لدراسة مواصفات القماش وتقديم أفضل عروض أسعار تنافسية.'
        : 'A server-side 60-minute countdown window ensures competitive bidding by preventing premature selection before eligible cutting floors submit their rates.',
    },
  ];

  return (
    <div className="space-y-16 lg:space-y-24 py-8">
      {/* Logged-in Customer Quota & Status Banner */}
      {currentUser && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 shadow-md flex flex-wrap items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{isAr ? 'حساب المستأجر المسجل:' : 'Active Account:'}</span>
                  <span className="font-bold text-white">{userSubStatus?.tenant?.name || currentUser.name}</span>
                  {userSubStatus?.tenant?.tenant_type === 'marketplace_requester' && (
                    <Badge variant="brand" className="text-[10px]">
                      {isAr ? 'طالب خدمة مستقل' : 'Independent Requester'}
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-bold flex items-center gap-2 mt-0.5">
                  {userSubStatus?.requester_subscription?.is_valid ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isAr
                          ? `رصيد طلبات القص المتبقي: ${userSubStatus.requester_subscription.remaining_rfq_count} من ${userSubStatus.requester_subscription.allowed_rfq_count} طلبات`
                          : `Remaining RFQs: ${userSubStatus.requester_subscription.remaining_rfq_count} / ${userSubStatus.requester_subscription.allowed_rfq_count}`}
                      </span>
                    </span>
                  ) : userSubStatus?.pending_payment_request ? (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>
                        {isAr
                          ? `طلب سداد باقة ${userSubStatus.pending_payment_request.plan_name} قيد المراجعة المالية (مرجع: ${userSubStatus.pending_payment_request.transfer_reference})`
                          : `Payment review pending for ${userSubStatus.pending_payment_request.plan_name}`}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {isAr ? 'لا يوجد رصيد باقة قص نشط حالياً.' : 'No active cutting request quota.'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs"
              >
                <CreditCard className="w-3.5 h-3.5 me-1.5" />
                <span>{isAr ? 'شحن باقة طلبات قص' : 'Purchase Quota Pack'}</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('marketplace')}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs"
              >
                <span>{isAr ? 'لوحة طلبات القص' : 'Marketplace Dashboard'}</span>
                <ArrowIcon className="w-3.5 h-3.5 ms-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#180a10] to-[#2b080f] px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-white border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#e11d48_1px,transparent_1px)] [background-size:28px_28px] opacity-15 pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 backdrop-blur-md text-xs font-bold text-rose-300 shadow-sm">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'البورصة الصناعية الحصرية لمشتركي باقة Enterprise وباقات وصلة ورش' : 'Exclusive B2B Industrial Exchange for Enterprise & Waslat Worsh Subscribers'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight font-sans">
            {isAr ? (
              <span>
                منصة <span className="text-rose-400">وصلة ورش</span> لتبادل طاقات القص والتصنيع
              </span>
            ) : (
              <span>
                Waslat Worsh: <span className="text-rose-400">Cutting Capacity</span> Exchange
              </span>
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {isAr
              ? 'السوق الرقمي الموثق الذي يربط كبرى مصانع الملابس الجاهزة مع صالات القص الآلي والورش المتخصصة في مصر. استغل طاقتك الفائضة أو تعاقد مع صالة قص معتمدة لتشغيل طلبياتك بأعلى كفاءة تعشيق.'
              : 'The verified industrial capacity exchange connecting garment manufacturing brands with CNC automatic cutting floors and specialized workshops.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {!currentUser ? (
              <button
                onClick={() => setIsRequesterRegModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                <span>{isAr ? 'طرح طلبات قص (تسجيل طالب خدمة)' : 'Post Cutting RFQs (Requester)'}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isAr ? 'شراء باقة طلبات قص' : 'Purchase Cutting RFQ Pack'}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onOpenRegister('enterprise')}
              className="px-6 py-3 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'الانضمام كصالة قص مزودة (Enterprise)' : 'Join as Cutting Provider'}</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('public-rfqs-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{isAr ? 'تصفح طلبات القص النشطة' : 'Browse Active Cutting RFQs'}</span>
            </button>
          </div>

          {/* Safe Legal Intermediary Notice */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 max-w-2xl mx-auto text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAr
                ? 'GarmentOS وسيط تقني لتنظيم البورصة وتوثيق المواصفات وعزل الأمانات، وليست طرفاً تنفيذياً في عقد القص.'
                : 'GarmentOS operates as a technology intermediary platform and is not a direct manufacturing contractor.'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. REAL METRICS STRIP (Strictly Calculated from DB) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl text-center">
          <div className="space-y-1 p-2">
            <div className="text-2xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {metrics.active_rfqs_count.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'طلب قص نشط في البورصة' : 'Active Cutting RFQs'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isAr ? 'مفتوح لاستقبال عروض الأسعار' : 'Open for competitive offers'}
            </div>
          </div>

          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {metrics.total_target_pieces.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'قطعة مطلوبة للقص' : 'Total Pieces Demanded'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isAr ? 'طاقة تشغيل متاحة للتنفيذ' : 'Verified floor capacity volume'}
            </div>
          </div>

          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {metrics.governorates_count}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'محافظات مشمولة' : 'Governorates Covered'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isAr ? 'تغطية صناعية للمراكز الكبرى' : 'Major textile clusters'}
            </div>
          </div>

          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-4xl font-black text-amber-500 font-mono">
              {metrics.categories_count || 4}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'فئات تصنيعية متخصصة' : 'Apparel Categories'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isAr ? 'رجالي، حريمي، أطفال، موحد' : 'Men, Women, Kids & Uniform'}
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS: THE INTERMEDIARY JOURNEY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="brand">{isAr ? 'دورة عمل واضحة ونزيهة' : 'Transparent Workflow'}</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans">
            {isAr ? 'كيف تعمل بورصة وصلة ورش الصناعية؟' : 'How Does the Waslat Worsh Exchange Operate?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'نموذج عمل متقدم يشبه منصات مشاركة الطاقة العالمية: يطرح طالب الخدمة مواصفاته، وتتنافس الصالات المعتمدة خلال نافذة زمنية عادلة.'
              : 'A structured B2B capacity model: Requesters publish specs, verified providers submit rates, and mutual acceptance secures the job.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Requester Journey Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isAr ? 'رحلة طالب خدمة القص (المصنع / البراند)' : 'Requester Journey (Brand / Factory)'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {isAr ? 'طرح طلبيات القص واستقبال أفضل عروض الأسعار' : 'Publish orders and compare verified rates'}
                </span>
              </div>
            </div>

            <ol className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold shrink-0 text-xs">
                  1
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{isAr ? 'إنشاء مسودة الطلب الفنية:' : 'Draft Technical Request:'}</strong>
                  <span>{isAr ? 'تحديد خامة القماش، الوزن GSM، المقاسات، الألوان، وماكينة القص المطلوبة.' : 'Specify fabric GSM, width, sizing breakdown, and cutter preference.'}</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold shrink-0 text-xs">
                  2
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{isAr ? 'النشر وبدء نافذة الـ 60 دقيقة:' : 'Publish & 60-Min Window:'}</strong>
                  <span>{isAr ? 'طرح الطلب في السوق لبدء استقبال عروض أسعار صالات القص خلال مؤقت عادل.' : 'Broadcast request to eligible cutting floors under server-side timer.'}</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold shrink-0 text-xs">
                  3
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{isAr ? 'المقارنة والترسية المتبادلة:' : 'Compare & Mutual Award:'}</strong>
                  <span>{isAr ? 'مقارنة سعر القطعة وميعاد التسليم، واختيار العرض مع اعتماد صالة القص.' : 'Compare unit rates, select the winning floor, and confirm terms.'}</span>
                </div>
              </li>
            </ol>
          </div>

          {/* Provider Journey Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Scissors className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isAr ? 'رحلة مقدم الخدمة (صالة القص / المشغل)' : 'Provider Journey (Cutting Floor)'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {isAr ? 'استغلال الطاقة الفائضة للماكينات وتحقيق أرباح مستمرة' : 'Monetize floor downtime with high-volume cutting jobs'}
                </span>
              </div>
            </div>

            <ol className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold shrink-0 text-xs">
                  1
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{isAr ? 'استعراض الفرص المتاحة:' : 'Review Floor Opportunities:'}</strong>
                  <span>{isAr ? 'الاطلاع على طلبات القص المطروحة في محافظتك ودراسة نوع القماش والكمية.' : 'Inspect published orders in your region matching your cutting capacity.'}</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold shrink-0 text-xs">
                  2
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{isAr ? 'تقديم سعر القطعة ومدة التنفيذ:' : 'Submit Unit Rate & Lead Time:'}</strong>
                  <span>{isAr ? 'تقديم عرض رسمي بسعر القطعة التنافسي وعدد الأيام الملتزم بها للإنهاء.' : 'Quote your best per-piece price and promised turnaround days.'}</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold shrink-0 text-xs">
                  3
                </span>
                <div>
                  <strong className="block text-slate-900 dark:text-white">{isAr ? 'الترسية واستلام القماش:' : 'Job Order Award & Fabric Receipt:'}</strong>
                  <span>{isAr ? 'تحويل العرض لأمر تشغيل JobOrder رسمي مع عزل أمانات القماش محاسبياً.' : 'Convert winning bid to an isolated CMT custody JobOrder in ERP.'}</span>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* 4. REAL LIVE PUBLISHED RFQS EXPLORER */}
      <section id="public-rfqs-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans">
                {isAr ? 'طلبات القص المنشورة حالياً في البورصة' : 'Active Public Cutting Requests'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {totalRfqs} {isAr ? 'طلب' : 'RFQs'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isAr
                ? 'بيانات حقيقية محدثة لحظياً من المصانع المسجلة. العناوين الدقيقة وأرقام التواصل مشفرة ومحمية.'
                : 'Real-time verified requests from active factories. Contacts and exact addresses remain encrypted.'}
            </p>
          </div>

          {/* Search & Filter Form */}
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث في الطلبات والموديلات...' : 'Search models & titles...'}
                className="ps-8 pe-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs w-44 sm:w-56 text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 px-3 text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="all">{isAr ? 'كافة الفئات' : 'All Categories'}</option>
              <option value="men">{isAr ? 'ملابس رجالي' : 'Men'}</option>
              <option value="women">{isAr ? 'ملابس حريمي' : 'Women'}</option>
              <option value="kids">{isAr ? 'أطفالي وبيبي' : 'Kids & Baby'}</option>
              <option value="uniform">{isAr ? 'يونيفورم وموحد' : 'Uniform'}</option>
            </select>

            <Button size="sm" variant="outline" type="submit" disabled={isLoadingRfqs}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRfqs ? 'animate-spin' : ''}`} />
            </Button>
          </form>
        </div>

        {/* Listing Grid */}
        {isLoadingRfqs ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
              </div>
            ))}
          </div>
        ) : rfqs.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Scissors className="w-12 h-12 mx-auto text-slate-400 opacity-40" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              {isAr ? 'لا توجد طلبات قص مطروحة حالياً في هذه الفئة' : 'No active cutting requests in this category'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isAr
                ? 'يتم تحديث البورصة فور قيام مشتركي باقة Enterprise بنشر طلبات تشغيل جديدة.'
                : 'Requests are published regularly by verified Enterprise subscribers.'}
            </p>
            <button
              onClick={() => onOpenRegister('enterprise')}
              className="mt-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors cursor-pointer"
            >
              {isAr ? 'اطرح أول طلب قص لمصنعك' : 'Publish Cutting Request'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rfqs.map((rfq) => (
              <Card
                key={rfq.id}
                className="p-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between hover:border-rose-400/50 dark:hover:border-rose-500/50 transition-all shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          {rfq.rfq_number}
                        </span>
                        <Badge variant="brand" className="text-[10px]">
                          {rfq.garment_category === 'men' ? (isAr ? 'رجالي' : 'Men') : rfq.garment_category === 'women' ? (isAr ? 'حريمي' : 'Women') : rfq.garment_category === 'kids' ? (isAr ? 'أطفالي' : 'Kids') : (isAr ? 'موحد' : 'Uniform')}
                        </Badge>
                        <Badge variant="success" className="text-[10px]">
                          {isAr ? 'نشط بالبورصة' : 'Active'}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                        {rfq.title}
                      </h3>
                      {rfq.model_name && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {isAr ? 'الموديل: ' : 'Model: '}{rfq.model_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'الكمية المستهدفة' : 'Quantity'}</span>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {rfq.target_quantity.toLocaleString()} {isAr ? 'ق' : 'pcs'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'الخامة' : 'Fabric'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {rfq.fabric_summary?.fabric_type || (isAr ? 'أقمشة ملابس' : 'Apparel Fabric')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{rfq.location?.pickup_governorate} {rfq.location?.pickup_city ? `• ${rfq.location.pickup_city}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{isAr ? 'مطلوب التسليم: ' : 'Deadline: '}<strong className="text-slate-700 dark:text-slate-300 font-mono">{rfq.expected_delivery_date}</strong></span>
                    </div>
                    {rfq.attachments_indicator?.has_attachments && (
                      <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>{isAr ? 'يحتوي على باترونات ومواصفات فنية' : 'Includes CAD patterns & Tech specs'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>{isAr ? 'العناوين مشفرة' : 'Encrypted'}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDetail(rfq.id)}
                    className="text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 me-1 text-rose-500" />
                    {isAr ? 'المواصفات الفنية' : 'Specs'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1 || isLoadingRfqs}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              {isAr ? 'السابق' : 'Previous'}
            </Button>
            <span className="text-xs text-slate-500 font-mono px-3">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages || isLoadingRfqs}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              {isAr ? 'التالي' : 'Next'}
            </Button>
          </div>
        )}
      </section>

      {/* 5. ENTERPRISE EXCLUSIVITY & GATE BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-[#22070e] text-white border border-rose-900/30 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
              <Crown className="w-4 h-4" />
              <span>{isAr ? 'حصرية باقة Enterprise القصوى' : 'Enterprise Tier Exclusive'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-sans">
              {isAr ? 'تريد تقديم عروض أسعار أو تشغيل طلبيات مصنعك؟' : 'Ready to submit quotes or outsource cutting?'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'المشاركة في سوق وصلة ورش وطرح المناقصات أو تقديم عروض الأسعار مقصورة حصرياً على كبرى المصانع والشركات المشتركة في باقة Enterprise لضمان الجدية والأمان التعاقدي.'
                : 'Marketplace participation, bid submissions, and technical CAD file access are restricted exclusively to verified Enterprise factory subscribers.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={() => onOpenRegister('enterprise')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-rose-950/50"
            >
              {isAr ? 'ترقية المصنع لباقة Enterprise' : 'Upgrade to Enterprise'}
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {isAr ? 'مقارنة الباقات والأسعار' : 'Compare Plans'}
            </button>
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {isAr ? 'تسجيل دخول المشتركين' : 'Subscriber Sign In'}
            </button>
          </div>
        </div>
      </section>

      {/* 5.5 WASLAT WORSH INDEPENDENT REQUESTER PACKAGES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'حساب طالب خدمة مستقل' : 'Independent Requester Plans'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
            {isAr ? 'باقات الاشتراك المستقلة لطالبي خدمات القص' : 'Waslat Worsh Cutting Requester Packages'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {isAr
              ? 'اشترك في باقة طلبات القص واطرح مناقصاتك مباشرة لكبرى مشاغل القص المعتمدة دون الحاجة لشراء أو تفعيل نظام الـ ERP.'
              : 'Subscribe to an RFQ package and tender your cutting orders directly to verified workshops without requiring an ERP subscription.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(availablePlans.length > 0 ? availablePlans : [
            { code: 'ww_starter_5', name_ar: 'باقة البداية (5 طلبات)', name_en: 'Starter (5 RFQs)', monthly_price: 300, quota_rfq_count: 5, billing_duration: 30, description_ar: 'مثالية للعلامات الصاعدة وتجربة السوق.' },
            { code: 'ww_growth_15', name_ar: 'باقة النمو (15 طلباً)', name_en: 'Growth (15 RFQs)', monthly_price: 750, quota_rfq_count: 15, billing_duration: 60, description_ar: 'الخيار الأكثر طلباً للعلامات التجارية النشطة.', is_popular: true },
            { code: 'ww_pro_15', name_ar: 'باقة المحترفين (15 طلباً)', name_en: 'Pro (15 RFQs)', monthly_price: 800, quota_rfq_count: 15, billing_duration: 60, description_ar: 'صلاحية 60 يوماً واستقبال عروض مفصلة.' },
            { code: 'ww_enterprise_50', name_ar: 'باقة الشركات (50 طلباً)', name_en: 'Enterprise Pack (50 RFQs)', monthly_price: 2200, quota_rfq_count: 50, billing_duration: 90, description_ar: 'حصة كبرى للمجموعات التجارية والتشغيل المكثف.' },
          ]).map((pkg: any) => {
            const isPopular = pkg.is_popular || pkg.code === 'ww_growth_15';
            return (
              <div
                key={pkg.code || pkg.id}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between relative ${
                  isPopular
                    ? 'border-rose-500 shadow-xl ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-md">
                    {isAr ? 'الأكثر طلباً' : 'Popular'}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white font-sans">
                      {isAr ? pkg.name_ar : (pkg.name_en || pkg.name_ar)}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 min-h-[30px] leading-relaxed">
                      {isAr ? pkg.description_ar : (pkg.description_en || pkg.description_ar)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-slate-950 dark:text-white font-mono">
                        {Number(pkg.monthly_price).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-sans">
                        {isAr ? 'ج.م إجمالي' : 'EGP total'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isAr ? `حصة ${pkg.quota_rfq_count} طلبات قص معتمدة` : `${pkg.quota_rfq_count} RFQs quota`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isAr ? `صلاحية ${pkg.billing_duration || 30} يوماً من التفعيل` : `Valid for ${pkg.billing_duration || 30} days`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isAr ? 'تشفير عناوين الاستلام والمخازن' : 'Private location encryption'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isAr ? 'مقارنة وترسية العروض التنافسية' : 'Compare & award offers'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedPlanCode(pkg.code);
                      setIsRequesterRegModalOpen(true);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      isPopular
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
                        : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {isAr ? 'اشترك واطرح طلباتك' : 'Subscribe & Tender'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="neutral">{isAr ? 'إجابات واضحة' : 'FAQ'}</Badge>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
            {isAr ? 'الأسئلة الشائعة حول وصلة ورش' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full p-4 text-start font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* MODAL: PRIVACY-SAFE REQUEST DETAIL */}
      {isDetailModalOpen && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedRfqDetail(null);
          }}
          title={
            selectedRfqDetail
              ? `${isAr ? 'المواصفات العامة لطلب القص' : 'Public Cutting Specifications'} [${selectedRfqDetail.rfq_number}]`
              : (isAr ? 'جاري التحميل...' : 'Loading...')
          }
          maxWidth="xl"
        >
          {isLoadingDetail || !selectedRfqDetail ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500">{isAr ? 'جاري استرجاع بيانات الطلب الآمنة...' : 'Fetching specifications...'}</p>
            </div>
          ) : (
            <div className="space-y-5 text-xs text-slate-800 dark:text-slate-200">
              {/* Header Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedRfqDetail.title}
                    </h3>
                    {selectedRfqDetail.model_name && (
                      <span className="text-[11px] text-slate-500">
                        {isAr ? 'الموديل: ' : 'Model: '}{selectedRfqDetail.model_name}
                      </span>
                    )}
                  </div>
                  <div className="text-end">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الكمية المطلوبة' : 'Quantity'}</span>
                    <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400">
                      {selectedRfqDetail.target_quantity.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الموعد الأقصى للتسليم' : 'Deadline'}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedRfqDetail.expected_delivery_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الموقع العام' : 'Location'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedRfqDetail.location?.pickup_governorate} ({selectedRfqDetail.location?.pickup_city || (isAr ? 'المدينة معلنة' : 'City')})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'مسؤولية النقل' : 'Transport'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedRfqDetail.location?.transport_responsibility === 'provider' ? (isAr ? 'الورشة / مقدم الخدمة' : 'Provider') : (isAr ? 'صاحب الطلب' : 'Requester')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fabric Specs */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isAr ? 'مواصفات القماش' : 'Fabric Details'}</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 block">{isAr ? 'نوع الخامة' : 'Type'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRfqDetail.fabric_details_public?.fabric_type || '-'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 block">{isAr ? 'التركيب' : 'Composition'}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedRfqDetail.fabric_details_public?.fabric_composition || '-'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 block">{isAr ? 'عرض القماش' : 'Width'}</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {selectedRfqDetail.fabric_details_public?.fabric_width_cm ? `${selectedRfqDetail.fabric_details_public.fabric_width_cm} cm` : '-'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 block">{isAr ? 'وزن المتر GSM' : 'Weight'}</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {selectedRfqDetail.fabric_details_public?.fabric_weight_gsm ? `${selectedRfqDetail.fabric_details_public.fabric_weight_gsm} GSM` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sizing Breakdown */}
              {selectedRfqDetail.production_details_public?.size_breakdown && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isAr ? 'توزيع المقاسات' : 'Size Breakdown'}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center text-xs">
                    {Object.entries(selectedRfqDetail.production_details_public.size_breakdown).map(([sz, qty]: [string, any]) => (
                      <div key={sz} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <span className="font-bold text-slate-900 dark:text-white block">{sz}</span>
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{Number(qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Warning & Action CTA */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{isAr ? 'حماية سرية البيانات والملفات الفنية:' : 'Privacy Protection Notice:'}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {selectedRfqDetail.attachments_indicator?.notice ||
                    (isAr
                      ? 'العناوين الدقيقة للمخازن، أرقام الهواتف، وملفات الباترون والماركر DXF مشفرة بالكامل. لتقديم عرض سعر رسمي أو تحميل الباترونات، يرجى تسجيل الدخول بحساب مصنع معتمد في باقة Enterprise.'
                      : 'Exact warehouse addresses, contact numbers, and downloadable CAD pattern files are strictly encrypted for Enterprise subscribers.')}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedRfqDetail(null);
                  }}
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      onOpenLogin();
                    }}
                  >
                    {isAr ? 'تسجيل دخول المشتركين' : 'Sign In'}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      onOpenRegister('enterprise');
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white"
                  >
                    <Crown className="w-3.5 h-3.5 me-1.5" />
                    {isAr ? 'الترقية للمشاركة في العروض' : 'Upgrade to Enterprise'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* 5. REQUESTER REGISTRATION MODAL (Stage C.2: Independent Requester Identity) */}
      <Modal
        isOpen={isRequesterRegModalOpen}
        onClose={() => setIsRequesterRegModalOpen(false)}
        title={isAr ? 'تسجيل حساب طالب خدمة مستقل — سوق وصلة ورش' : 'Register Independent Requester Account'}
        maxWidth="lg"
      >
        <form onSubmit={handleRegisterRequesterSubmit} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
            <span className="font-bold block mb-1">
              {isAr ? 'حساب مخصص لأصحاب البراندات والمصانع الباحثة عن خدمات القص:' : 'Account tailored for fashion brands & garment businesses:'}
            </span>
            <span className="text-[11px] leading-relaxed">
              {isAr
                ? 'يتيح لك هذا الحساب شراء باقات طلبات القص وطرح العمليات في البورصة لمنافسة صالات القص المعتمدة دون الحاجة لشراء نظام GarmentOS ERP كاملاً.'
                : 'Allows you to purchase RFQ quotas and post cutting tenders directly to certified cutting floors.'}
            </span>
          </div>

          {regError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs">
              {regError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">{isAr ? 'اسم المنشأة / الشركة' : 'Business / Legal Name'} *</label>
              <input
                type="text"
                required
                value={regTenantName}
                onChange={(e) => setRegTenantName(e.target.value)}
                placeholder={isAr ? 'مثال: شركة مودرن فاشن' : 'e.g. Modern Fashion Co.'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">{isAr ? 'اسم العلامة التجارية / البراند' : 'Brand Name'}</label>
              <input
                type="text"
                value={regBrandName}
                onChange={(e) => setRegBrandName(e.target.value)}
                placeholder={isAr ? 'مثال: UrbanWear' : 'e.g. UrbanWear'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">{isAr ? 'اسم المسؤول' : 'Owner / Manager Name'} *</label>
              <input
                type="text"
                required
                value={regOwnerName}
                onChange={(e) => setRegOwnerName(e.target.value)}
                placeholder={isAr ? 'الاسم ثلاثي' : 'Full Name'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">{isAr ? 'البريد الإلكتروني' : 'Email Address'} *</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">{isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'} *</label>
              <input
                type="text"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">{isAr ? 'المحافظة / المدينة' : 'City / Governorate'} *</label>
              <input
                type="text"
                required
                value={regCity}
                onChange={(e) => setRegCity(e.target.value)}
                placeholder={isAr ? 'القاهرة' : 'Cairo'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">{isAr ? 'كلمة المرور' : 'Password'} *</label>
              <input
                type="password"
                required
                minLength={8}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'} *</label>
              <input
                type="password"
                required
                minLength={8}
                value={regPasswordConf}
                onChange={(e) => setRegPasswordConf(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRequesterRegModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingReg}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              {isSubmittingReg ? (isAr ? 'جارِ التسجيل...' : 'Registering...') : (isAr ? 'تسجيل ومتابعة باقات القص' : 'Register & Continue')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. PAYMENT REQUEST MODAL (Stage C.3 & C.4: Subscription Catalog & Payment Proof) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={isAr ? 'شراء باقة طلبات قص — منصة وصلة ورش' : 'Purchase Waslat Worsh RFQ Quota'}
        maxWidth="lg"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
          {paymentSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>{paymentSuccessMsg}</span>
            </div>
          )}

          {paymentError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* 1. Package Selection */}
          <div className="space-y-2">
            <label className="font-bold block">{isAr ? 'اختر باقة طلبات القص:' : 'Select Cutting Request Pack:'}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(availablePlans.length > 0 ? availablePlans : [
                { code: 'ww_starter_5', name_ar: 'باقة تجربة البداية', quota_rfq_count: 5, monthly_price: 300 },
                { code: 'ww_pro_15', name_ar: 'باقة التشغيل الاحترافي', quota_rfq_count: 15, monthly_price: 800 },
                { code: 'ww_enterprise_50', name_ar: 'باقة العلامات الكبرى', quota_rfq_count: 50, monthly_price: 2200 },
              ]).map((plan: any) => {
                const isSelected = selectedPlanCode === plan.code;
                return (
                  <div
                    key={plan.code}
                    onClick={() => {
                      setSelectedPlanCode(plan.code);
                      setSubmittedAmount(Number(plan.monthly_price));
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-rose-600 bg-rose-500/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white mb-1">{plan.name_ar || plan.name_en || plan.code}</div>
                    <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                      {Number(plan.monthly_price).toLocaleString()} EGP
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {isAr ? `تتضمن ${plan.quota_rfq_count} طلبات قص معتمدة` : `Includes ${plan.quota_rfq_count} RFQs`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Transfer Instructions Box */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>{isAr ? 'بيانات التحويل الرسمي المعتمد للمنصة:' : 'Official Payment Transfer Details:'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block">{isAr ? 'InstaPay (تحويل فوري)' : 'InstaPay'}</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {paymentInstructions?.instapay_address || 'garmentos@instapay'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block">{isAr ? 'تحويل بنكي رسمي (CIB)' : 'Bank Transfer (CIB)'}</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {paymentInstructions?.account_number || '100049281729'}
                </span>
                <span className="block text-[10px] text-slate-500">{paymentInstructions?.bank_name || 'البنك التجاري الدولي مصر'}</span>
              </div>
            </div>
          </div>

          {/* 3. Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">{isAr ? 'طريقة التحويل' : 'Payment Method'} *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="instapay">InstaPay</option>
                <option value="bank_transfer">{isAr ? 'تحويل بنكي مباشر' : 'Bank Transfer'}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1">{isAr ? 'رقم أو مرجع التحويل (Reference / RRN)' : 'Transfer Reference'} *</label>
              <input
                type="text"
                required
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder={isAr ? 'مثال: INSTA-8921479' : 'e.g. REF-12345678'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* 4. Receipt Upload */}
          <div>
            <label className="block font-bold mb-1">{isAr ? 'إرفاق صورة إيصال السداد أو لقطة الشاشة' : 'Attach Receipt Image'} *</label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-rose-500 transition-colors cursor-pointer relative bg-slate-50 dark:bg-slate-800/40">
              <input
                type="file"
                required
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setReceiptFile(file);
                    if (file.type.startsWith('image/')) {
                      setReceiptPreview(URL.createObjectURL(file));
                    } else {
                      setReceiptPreview(null);
                    }
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {receiptPreview ? (
                <div className="space-y-2">
                  <img src={receiptPreview} alt="Receipt preview" className="max-h-36 mx-auto rounded-lg shadow-sm border" />
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-bold">{receiptFile?.name}</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-7 h-7 mx-auto text-slate-400" />
                  <div className="font-bold text-slate-700 dark:text-slate-300">
                    {receiptFile ? receiptFile.name : (isAr ? 'انقر أو اسحب صورة الإيصال هنا (PNG, JPG, PDF)' : 'Upload transfer receipt')}
                  </div>
                  <div className="text-[10px] text-slate-400">{isAr ? 'الحد الأقصى للملف: 5 ميجابايت' : 'Max size: 5MB'}</div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAr ? 'مراجعة واعتماد يدوي آمن من الإدارة المالية' : 'Manual finance audit required'}</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingPayment}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                {isSubmittingPayment ? (isAr ? 'جارِ الإرسال...' : 'Submitting...') : (isAr ? 'إرسال إثبات السداد' : 'Submit Payment Proof')}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
