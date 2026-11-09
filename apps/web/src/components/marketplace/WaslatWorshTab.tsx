import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Building2,
  Users,
  Search,
  Plus,
  Star,
  CheckCircle2,
  Phone,
  MapPin,
  Briefcase,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Crown,
  Lock,
  ShieldCheck,
  History,
  Scissors,
  Eye,
  DollarSign,
  Truck,
  Clock,
  XCircle,
  FolderKanban,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { WorkshopProfile, Rfq } from '../../types';
import { CreateCuttingRequestModal } from './CreateCuttingRequestModal';
import { CuttingRequestDetailsModal } from './CuttingRequestDetailsModal';

interface WaslatWorshTabProps {
  isAr?: boolean;
  onNavigateToSubscription?: () => void;
}

export const WaslatWorshTab: React.FC<WaslatWorshTabProps> = ({ isAr = true, onNavigateToSubscription }) => {
  const [activeSubTab, setActiveSubTab] = useState<'rfqs' | 'my_rfqs' | 'my_bids' | 'my_operations' | 'workshops'>('rfqs');
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [myRfqs, setMyRfqs] = useState<Rfq[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // P4: Factory Cutting Workspace Operations & Bids
  const [myBids, setMyBids] = useState<any[]>([]);
  const [isMyBidsLoading, setIsMyBidsLoading] = useState(false);
  const [myOperations, setMyOperations] = useState<any[]>([]);
  const [isMyOperationsLoading, setIsMyOperationsLoading] = useState(false);
  const [isWithdrawingBid, setIsWithdrawingBid] = useState<string | null>(null);
  const [isUpdatingOpStatus, setIsUpdatingOpStatus] = useState<string | null>(null);

  // Stage B: Premium Enterprise Entitlement States
  const [isCheckingEligibility, setIsCheckingEligibility] = useState<boolean>(true);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [entitlementError, setEntitlementError] = useState<any>(null);
  const [isViewingHistoryOnly, setIsViewingHistoryOnly] = useState<boolean>(false);
  const [eligibilityData, setEligibilityData] = useState<any>(null);

  // Stage C.3 & C.4: Separate Requester Pack Purchase State
  const [isBuyPackModalOpen, setIsBuyPackModalOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState('ww_starter_5');
  const [paymentMethod, setPaymentMethod] = useState<'instapay' | 'bank_transfer'>('instapay');
  const [transferRef, setTransferRef] = useState('');
  const [submittedAmount, setSubmittedAmount] = useState(300);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stage C: Cutting Requests & Drafts state
  const [rfqStatusFilter, setRfqStatusFilter] = useState<'all' | 'published' | 'drafts'>('all');
  const [isCreateCuttingModalOpen, setIsCreateCuttingModalOpen] = useState<boolean>(false);
  const [isCuttingDetailsModalOpen, setIsCuttingDetailsModalOpen] = useState<boolean>(false);
  const [selectedCuttingRfq, setSelectedCuttingRfq] = useState<Rfq | null>(null);
  const [editingDraftRfq, setEditingDraftRfq] = useState<Rfq | null>(null);

  // Modals state
  const [isCreateRfqModalOpen, setIsCreateRfqModalOpen] = useState<boolean>(false);
  const [isSubmitBidModalOpen, setIsSubmitBidModalOpen] = useState<boolean>(false);
  const [isReviewBidsModalOpen, setIsReviewBidsModalOpen] = useState<boolean>(false);
  const [isCreateWorkshopModalOpen, setIsCreateWorkshopModalOpen] = useState<boolean>(false);

  // Selected records for modals
  const [selectedRfq, setSelectedRfq] = useState<Rfq | null>(null);
  const [selectedRfqDetails, setSelectedRfqDetails] = useState<Rfq | null>(null);

  // Form states: Create RFQ
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqServiceType, setRfqServiceType] = useState<'sewing' | 'cutting' | 'embroidery' | 'printing' | 'full_cmt'>('full_cmt');
  const [rfqQuantity, setRfqQuantity] = useState(1000);
  const [rfqSpecs, setRfqSpecs] = useState('');
  const [rfqDeliveryDate, setRfqDeliveryDate] = useState('');
  const [rfqBudget, setRfqBudget] = useState(25);
  const [rfqFabricResp, setRfqFabricResp] = useState<'seeker_provided' | 'workshop_sourced'>('seeker_provided');
  const [isSubmittingRfq, setIsSubmittingRfq] = useState(false);

  // Form states: Submit Bid
  const [bidWorkshopId, setBidWorkshopId] = useState('');
  const [bidUnitRate, setBidUnitRate] = useState(20);
  const [bidLeadDays, setBidLeadDays] = useState(10);
  const [bidNotes, setBidNotes] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  // Form states: Create Workshop Profile
  const [wsName, setWsName] = useState('');
  const [wsSpecialty, setWsSpecialty] = useState<'sewing' | 'cutting' | 'embroidery' | 'printing' | 'finishing' | 'full_cmt'>('full_cmt');
  const [wsMachines, setWsMachines] = useState(12);
  const [wsDailyCapacity, setWsDailyCapacity] = useState(250);
  const [wsGovernorate, setWsGovernorate] = useState('القاهرة');
  const [wsCity, setWsCity] = useState('');
  const [wsPhone, setWsPhone] = useState('');
  const [wsContactPerson, setWsContactPerson] = useState('');
  const [isSubmittingWorkshop, setIsSubmittingWorkshop] = useState(false);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const isDraftsView = rfqStatusFilter === 'drafts';
      const [rfqRes, wsRes, myRfqsRes] = await Promise.all([
        api.waslatWorsh.getRfqs({
          service_type: selectedServiceFilter !== 'all' ? selectedServiceFilter : undefined,
          status: isDraftsView ? 'draft' : (rfqStatusFilter === 'published' ? 'published' : undefined),
          search: searchQuery.trim() || undefined,
          my_history: isDraftsView ? 1 : undefined,
        }),
        api.waslatWorsh.getWorkshops({
          specialty_type: selectedServiceFilter !== 'all' ? selectedServiceFilter : undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.waslatWorsh.getRfqs({ my_history: 1 }).catch(() => ({ data: [] })),
      ]);
      setRfqs(rfqRes.data || []);
      setWorkshops(wsRes.data || []);
      setMyRfqs(myRfqsRes.data || []);
      if (wsRes.data && wsRes.data.length > 0 && !bidWorkshopId) {
        setBidWorkshopId(wsRes.data[0].id);
      }
      // P4: Load factory bids and operations if provider eligible
      if (eligibilityData?.is_provider_eligible) {
        loadMyBids();
        loadMyOperations();
      }
    } catch (err: any) {
      if (err?.error === 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED' || err?.error_code === 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED' || err?.status === 403) {
        setIsEligible(false);
        setEntitlementError(err);
      } else {
        console.error('Failed to load Waslat Worsh data:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyBids = async () => {
    setIsMyBidsLoading(true);
    try {
      const res = await api.waslatWorsh.getMyBids();
      setMyBids(res.bids || []);
    } catch (err: any) {
      console.error('Failed to load my bids:', err);
    } finally {
      setIsMyBidsLoading(false);
    }
  };

  const loadMyOperations = async () => {
    setIsMyOperationsLoading(true);
    try {
      const res = await api.waslatWorsh.getMyOperations();
      setMyOperations(res.operations || []);
    } catch (err: any) {
      console.error('Failed to load my operations:', err);
    } finally {
      setIsMyOperationsLoading(false);
    }
  };

  const handleWithdrawBid = async (bidId: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من سحب هذا العرض؟' : 'Are you sure you want to withdraw this bid?')) return;
    setIsWithdrawingBid(bidId);
    try {
      await api.waslatWorsh.withdrawBid(bidId);
      setStatusMsg({ type: 'success', text: isAr ? 'تم سحب عرض السعر بنجاح.' : 'Bid withdrawn successfully.' });
      await loadMyBids();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || (isAr ? 'فشل سحب العرض' : 'Failed to withdraw bid') });
    } finally {
      setIsWithdrawingBid(null);
    }
  };

  const handleUpdateOperationStatus = async (rfqId: string, status: string, notes?: string) => {
    setIsUpdatingOpStatus(rfqId);
    try {
      await api.waslatWorsh.updateOperationStatus(rfqId, status, notes);
      setStatusMsg({ type: 'success', text: isAr ? 'تم تحديث الحالة التشغيلية لطلب القص بنجاح.' : 'Operation status updated successfully.' });
      await Promise.all([loadMyOperations(), loadData()]);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || (isAr ? 'فشل تحديث الحالة التشغيلية' : 'Failed to update operation status') });
    } finally {
      setIsUpdatingOpStatus(null);
    }
  };

  const checkEligibility = async () => {
    setIsCheckingEligibility(true);
    try {
      const res = await api.waslatWorsh.getEligibility();
      setEligibilityData(res);
      setIsEligible(res.is_eligible);
      if (!res.is_provider_eligible && (res.is_requester_eligible || res.requester_subscription)) {
        setActiveSubTab('my_rfqs');
      }
      if (!res.is_eligible) {
        setEntitlementError(res.entitlement);
        setIsLoading(false);
      } else {
        await loadData();
      }
    } catch (err: any) {
      if (err?.error === 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED' || err?.error_code === 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED' || err?.status === 403) {
        setIsEligible(false);
        setEntitlementError(err);
      } else {
        setIsEligible(true);
        await loadData();
      }
      setIsLoading(false);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const res = await api.waslatWorsh.getSubscriptionPlans();
      setAvailablePlans(res.plans || []);
      setPaymentInstructions(res.payment_instructions || null);
    } catch (err) {
      console.error('Failed loading plans in tab:', err);
    }
  };

  const handleBuyPackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentMsg(null);
    if (!transferRef.trim() || !receiptFile) {
      setPaymentMsg({ type: 'error', text: isAr ? 'يرجى إدخال مرجع التحويل وإرفاق صورة الإيصال' : 'Reference and receipt are required' });
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
      setPaymentMsg({ type: 'success', text: res.message || (isAr ? 'تم إرسال طلب السداد للاعتماد المالي' : 'Submitted for review') });
      await checkEligibility();
      setTimeout(() => {
        setIsBuyPackModalOpen(false);
        setPaymentMsg(null);
        setReceiptFile(null);
        setTransferRef('');
      }, 2000);
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err?.message || (isAr ? 'فشل إرسال إثبات السداد' : 'Failed to submit') });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  useEffect(() => {
    checkEligibility();
    loadSubscriptionPlans();
  }, [selectedServiceFilter, rfqStatusFilter]);

  // Handlers
  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRfq(true);
    setStatusMsg(null);
    try {
      await api.waslatWorsh.createRfq({
        title: rfqTitle,
        service_type: rfqServiceType,
        target_quantity: Number(rfqQuantity),
        specifications: rfqSpecs,
        expected_delivery_date: rfqDeliveryDate,
        max_budget_per_piece: Number(rfqBudget),
        fabric_responsibility: rfqFabricResp,
      });
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم نشر طلب التشغيل في سوق منصة وصلة ورش بنجاح!' : 'RFQ published successfully!',
      });
      setIsCreateRfqModalOpen(false);
      setRfqTitle('');
      setRfqSpecs('');
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل نشر الطلب' : 'Failed to publish RFQ'),
      });
    } finally {
      setIsSubmittingRfq(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq) return;
    setIsSubmittingBid(true);
    setStatusMsg(null);
    try {
      await api.waslatWorsh.submitBid(selectedRfq.id, {
        workshop_profile_id: bidWorkshopId,
        unit_rate: Number(bidUnitRate),
        promised_lead_days: Number(bidLeadDays),
        notes: bidNotes,
      });
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم تقديم عرض السعر للطلب بنجاح!' : 'Bid submitted successfully!',
      });
      setIsSubmitBidModalOpen(false);
      setBidNotes('');
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل تقديم العرض' : 'Failed to submit bid'),
      });
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const handleOpenReviewBids = async (rfq: Rfq) => {
    setSelectedRfq(rfq);
    try {
      const details = await api.waslatWorsh.getRfq(rfq.id);
      setSelectedRfqDetails(details);
    } catch {
      setSelectedRfqDetails(rfq);
    }
    setIsReviewBidsModalOpen(true);
  };

  const handleAcceptBid = async (rfqId: string, bidId: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من قبول هذا العرض وترسيته؟ سيتم تحويله تلقائياً إلى أمر تشغيل رسمي JobOrder واحتساب عمولة المنصة 3%.' : 'Award this bid? It will convert into an official JobOrder with a 3% platform commission.')) {
      return;
    }
    try {
      await api.waslatWorsh.acceptBid(rfqId, bidId);
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تمت ترسية العرض وتحويله إلى أمر تشغيل رسمي JobOrder بنجاح!' : 'Bid awarded and converted to JobOrder!',
      });
      setIsReviewBidsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشلت ترسية العرض' : 'Failed to award bid'),
      });
    }
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWorkshop(true);
    setStatusMsg(null);
    try {
      await api.waslatWorsh.createWorkshop({
        workshop_name: wsName,
        specialty_type: wsSpecialty,
        active_machines_count: Number(wsMachines),
        daily_capacity_pieces: Number(wsDailyCapacity),
        governorate: wsGovernorate,
        city: wsCity,
        phone: wsPhone,
        contact_person: wsContactPerson,
      });
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم تسجيل ورشة التصنيع في دليل المنصة بنجاح!' : 'Workshop registered successfully!',
      });
      setIsCreateWorkshopModalOpen(false);
      setWsName('');
      setWsPhone('');
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل تسجيل الورشة' : 'Failed to register workshop'),
      });
    } finally {
      setIsSubmittingWorkshop(false);
    }
  };

  const getServiceBadge = (type: string) => {
    switch (type) {
      case 'cutting':
        return <Badge variant="brand">{isAr ? 'قص للغير' : 'Cutting'}</Badge>;
      case 'sewing':
        return <Badge variant="neutral">{isAr ? 'خياطة وتجميع' : 'Sewing'}</Badge>;
      case 'embroidery':
        return <Badge variant="success">{isAr ? 'تطريز آلي' : 'Embroidery'}</Badge>;
      case 'printing':
        return <Badge variant="warning">{isAr ? 'طباعة سلك سكرين' : 'Printing'}</Badge>;
      default:
        return <Badge variant="brand">{isAr ? 'تصنيع كامل (CMT)' : 'Full CMT'}</Badge>;
    }
  };

  if (isCheckingEligibility) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">
          {isAr ? 'جاري التحقق من أهلية باقة المصنع لسوق وصلة ورش...' : 'Checking factory subscription entitlement for Waslat Worsh...'}
        </p>
      </div>
    );
  }

  if (isEligible === false && !isViewingHistoryOnly) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-fade-in">
        {/* Premium Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 shadow-2xl border border-indigo-500/30">
          <div className="absolute top-0 end-0 -mt-8 -me-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 start-0 -mb-8 -ms-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Crown className="w-3.5 h-3.5" />
                <span>{isAr ? 'حصرية باقة Enterprise للمصانع الكبرى' : 'Enterprise Plan Exclusive'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-300">
                <Lock className="w-3 h-3" />
                <span>{isAr ? 'سوق خدمات القص المغلق' : 'Gated Industrial Cutting Marketplace'}</span>
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                {isAr ? 'سوق وصلة ورش الصناعي متاح حصرياً لباقة Enterprise' : 'Waslat Worsh Marketplace is Exclusive to Enterprise Tier'}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                {isAr
                  ? 'تتيح منصة وصلة ورش لكبرى المجموعات الصناعية ومصانع الملابس الجاهزة طرح طلبات قص وتشغيل للغير واستقبال عروض تنافسية من صالات القص والمشاغل المعتمدة، مع حجب كامل لبيانات الاتصال حتى الترسية والتحقق المالي.'
                  : 'Waslat Worsh enables enterprise garment factories to publish industrial cutting RFQs and receive competitive bids from certified cutting workshops, with complete contact anonymity until mutual confirmation and commission verification.'}
              </p>
            </div>

            {/* Current Ineligible Status Alert */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <div className="font-bold text-white">
                  {isAr ? 'حالة اشتراك المصنع الحالي:' : 'Current Factory Subscription Status:'}{' '}
                  <span className="text-amber-300 font-mono underline">
                    {entitlementError?.current_plan === 'pro'
                      ? (isAr ? 'باقة المصانع المتطورة (Pro)' : 'Pro Factory')
                      : entitlementError?.current_plan === 'starter'
                      ? (isAr ? 'باقة الورش والمشاغل (Starter)' : 'Starter Workshop')
                      : (entitlementError?.reason || (isAr ? 'غير مؤهل' : 'Ineligible'))}
                  </span>
                </div>
                <p className="text-slate-300">
                  {entitlementError?.message ||
                    (isAr
                      ? 'هذه الميزة مقصورة حصرياً على كبرى المصانع والمصدرين المشتركين في باقة Enterprise السحابية.'
                      : 'This feature is restricted exclusively to apparel groups on the Enterprise Cloud Plan.')}
                </p>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  if (onNavigateToSubscription) {
                    onNavigateToSubscription();
                  } else {
                    window.location.hash = '#/subscription';
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 px-6 py-3"
              >
                <Crown className="w-4 h-4 me-2" />
                <span>{isAr ? 'ترقية الاشتراك إلى باقة Enterprise الآن' : 'Upgrade to Enterprise Plan Now'}</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsBuyPackModalOpen(true)}
                className="border-rose-400 bg-rose-600/30 text-white hover:bg-rose-600/50 font-bold px-6 py-3"
              >
                <Scissors className="w-4 h-4 me-2 text-rose-300" />
                <span>{isAr ? 'شراء باقة طلبات قص منفصلة (ابتداءً من 300 ج.م)' : 'Buy Separate Cutting Quota Pack (from 300 EGP)'}</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={async () => {
                  setIsViewingHistoryOnly(true);
                  setIsLoading(true);
                  try {
                    const res = await api.waslatWorsh.getRfqs({ my_history: 1 });
                    setRfqs(res.data || []);
                  } catch (e) {
                    console.error('History load error:', e);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <History className="w-4 h-4 me-2" />
                <span>{isAr ? 'استعراض سجلاتي التاريخية (قراءة فقط)' : 'View My Historical RFQs (Read-Only)'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 space-y-3 border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isAr ? 'عروض أسعار تنافسية خلال 60 دقيقة' : 'Competitive 60-Minute Offer Window'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isAr
                ? 'اطرح طلب القص لموديلاتك بدقة، واستقبل عروض الأسعار والطاقات المتاحة من أفضل الورش وصالات القص المؤهلة بنظام التنافس المغلق.'
                : 'Post your cutting requirements and receive competitive bids with production capacity commitments under a controlled 60-minute server window.'}
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isAr ? 'حماية الخصوصية وحجب بيانات التواصل' : 'Strict Contact Anonymity & Protection'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isAr
                ? 'تظل بيانات المصنع ومقدم الخدمة وأرقام الهواتف محجوبة تماماً حتى اعتماد العرض المختار والتحقق من سداد عمولة الوساطة (3% من كل طرف).'
                : 'Both parties remain anonymous and contacts are never exposed until mutual confirmation and verified manual 3% + 3% commission payments.'}
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isAr ? 'عزل أمانات الأقمشة والتشغيل للغير' : 'CMT Custody & Subcontracting Integration'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isAr
                ? 'تتحول الصفقات المعتمدة تلقائياً إلى أوامر تشغيل صناعية JobOrder مع سندات استلام خامات أمانة معزولة عن مخزون المصنع الفعلي.'
                : 'Awarded bids convert directly to official JobOrder records with segregated customer material receipts and accurate yield tracking.'}
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Star className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isAr ? 'تقييمات موثقة وجودة حياكة صناعية' : 'Verified Quality & Timeliness Ratings'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isAr
                ? 'سجل تقييمات غير قابل للتزييف لجودة القص، دقة المقاسات، والالتزام بمواعيد التسليم بعد إنجاز كل طلب في المنصة.'
                : 'Tamper-proof ratings on cut precision, fabric preservation, and punctual delivery after every completed industrial order.'}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Historical View Alert Banner if applicable */}
      {isViewingHistoryOnly && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 shrink-0" />
            <span>
              {isAr
                ? 'أنت تتصفح سجلات طلباتك التاريخية في وضع القراءة فقط. للمشاركة وطرح طلبات جديدة أو تقديم عروض، يلزم ترقية الاشتراك لباقة Enterprise.'
                : 'You are viewing your historical records in read-only mode. Enterprise subscription is required for new participation.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => (onNavigateToSubscription ? onNavigateToSubscription() : (window.location.hash = '#/subscription'))}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <Crown className="w-3.5 h-3.5 me-1" />
              <span>{isAr ? 'ترقية الآن' : 'Upgrade Now'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsViewingHistoryOnly(false)}>
              {isAr ? 'العودة لصفحة الميزة' : 'Back to Feature'}
            </Button>
          </div>
        </div>
      )}

      {/* Stage C.5 & P5: Requester Quota Strip & Progress */}
      {(eligibilityData?.requester_subscription || eligibilityData?.remaining_rfq_quota !== undefined || eligibilityData?.requester?.remaining_quota !== undefined) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-300 font-medium">
                {isAr ? 'حصة باقة طلبات القص المتاحة للمستأجر (Waslat Worsh Quota):' : 'Waslat Worsh RFQ Quota:'}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                <span className="text-white">
                  {isAr ? 'المتبقي:' : 'Remaining:'}{' '}
                  <strong className="text-emerald-400 font-mono text-base font-black">
                    {eligibilityData.requester_subscription?.remaining_rfq_count ?? eligibilityData.remaining_rfq_quota ?? eligibilityData.requester?.remaining_quota ?? 0}
                  </strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 text-xs">
                  {isAr ? 'المستهلك:' : 'Consumed:'}{' '}
                  <span className="font-mono font-semibold text-slate-200">
                    {eligibilityData.requester_subscription?.consumed_rfq_count ?? 0}
                  </span>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 text-xs">
                  {isAr ? 'الإجمالي:' : 'Allowed:'}{' '}
                  <span className="font-mono font-semibold text-slate-200">
                    {eligibilityData.requester_subscription?.allowed_rfq_count ?? (
                      (eligibilityData.requester_subscription?.consumed_rfq_count ?? 0) +
                      (eligibilityData.requester_subscription?.remaining_rfq_count ?? eligibilityData.remaining_rfq_quota ?? 0)
                    )}
                  </span>
                </span>
                {eligibilityData.requester_subscription?.expires_at && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {isAr ? 'صالحة حتى:' : 'Valid until:'}{' '}
                      <span className="font-mono text-slate-200">
                        {new Date(eligibilityData.requester_subscription.expires_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </span>
                  </>
                )}
              </div>
              {eligibilityData.requester_subscription?.allowed_rfq_count > 0 && (
                <div className="w-full max-w-xs bg-slate-700/60 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(((eligibilityData.requester_subscription.consumed_rfq_count || 0) / eligibilityData.requester_subscription.allowed_rfq_count) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBuyPackModalOpen(true)}
              className="border-indigo-400/40 text-indigo-200 hover:bg-indigo-500/20 text-xs"
            >
              <Plus className="w-3.5 h-3.5 me-1" />
              <span>{isAr ? 'شحن باقة طلبات إضافية' : 'Buy Quota Pack'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* 1. Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            <span>{isAr ? 'منصة وصلة ورش (Waslat Worsh B2B)' : 'Waslat Worsh Industrial Marketplace'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? 'سوق تبادل الطاقة الإنتاجية بين مصانع الملابس، مشاغل الخياطة، وصالات القص المعتمدة'
              : 'Integrated B2B capacity exchange connecting garment brands with specialized workshops'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isAr ? 'تحديث' : 'Refresh'}
          </Button>

          {!isViewingHistoryOnly && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsCreateWorkshopModalOpen(true)}>
                <Building2 className="w-3.5 h-3.5 me-1.5 text-indigo-500" />
                {isAr ? 'تسجيل مشغل / ورشة' : 'Register Workshop'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingDraftRfq(null);
                  setIsCreateCuttingModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Scissors className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'طرح طلب قص فني' : 'New Cutting RFQ'}
              </Button>

              <Button variant="outline" size="sm" onClick={() => setIsCreateRfqModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'طلب تشغيل عام' : 'Generic RFQ'}
              </Button>
            </>
          )}
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* P4 & P5: Workspace Counters (Provider vs Requester View) */}
      {eligibilityData?.is_provider_eligible === false ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card
            onClick={() => setActiveSubTab('my_rfqs')}
            className={`p-4 cursor-pointer transition-all border ${
              activeSubTab === 'my_rfqs'
                ? 'border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">{isAr ? 'إجمالي طلباتي للقص' : 'My Total RFQs'}</span>
              <FolderKanban className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {myRfqs.length}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{isAr ? 'كل طلبات القص المطروحة والمسودة' : 'All your cutting requests'}</span>
          </Card>

          <Card
            onClick={() => setActiveSubTab('my_rfqs')}
            className="p-4 cursor-pointer transition-all border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">{isAr ? 'عروض مستلمة للدراسة' : 'Received Bids'}</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {myRfqs.reduce((acc, r) => acc + (r.bids?.length || 0), 0)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{isAr ? 'عروض مقدمة من صالات القص' : 'Bids submitted by workshops'}</span>
          </Card>

          <Card
            onClick={() => setActiveSubTab('my_rfqs')}
            className="p-4 cursor-pointer transition-all border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">{isAr ? 'قيد التشغيل والتوريد' : 'In Execution'}</span>
              <Truck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {myRfqs.filter((r) => ['offer_selected', 'awarded', 'in_progress', 'delivered'].includes(r.status)).length}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{isAr ? 'طلبات تم اختيار عرضها وجاري تنفيذها' : 'Awarded work in execution'}</span>
          </Card>

          <Card
            onClick={() => setActiveSubTab('my_rfqs')}
            className="p-4 cursor-pointer transition-all border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">{isAr ? 'طلبات مكتملة ومستلمة' : 'Completed Requests'}</span>
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {myRfqs.filter((r) => r.status === 'completed').length}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{isAr ? 'طلبات تم استلام قطعها وإنهاؤها' : 'Delivered & finalized orders'}</span>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card
            onClick={() => setActiveSubTab('rfqs')}
            className={`p-4 cursor-pointer transition-all border ${
              activeSubTab === 'rfqs'
                ? 'border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">{isAr ? 'الطلبات المتاحة للقص' : 'Available Cutting Requests'}</span>
              <Scissors className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {rfqs.filter((r) => r.status === 'open' || r.status === 'published').length}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{isAr ? 'جاهزة لتقديم عروض الأسعار' : 'Open for bidding'}</span>
          </Card>

          <Card
            onClick={() => {
              setActiveSubTab('my_bids');
              loadMyBids();
            }}
            className={`p-4 cursor-pointer transition-all border ${
              activeSubTab === 'my_bids'
                ? 'border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">{isAr ? 'عروضي المقدمة' : 'My Submitted Offers'}</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {myBids.length}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{isAr ? 'عروض أسعار مرسلة للطلبات' : 'Offers submitted to RFQs'}</span>
          </Card>

          <Card
            onClick={() => {
              setActiveSubTab('my_operations');
              loadMyOperations();
            }}
            className={`p-4 cursor-pointer transition-all border ${
              activeSubTab === 'my_operations'
                ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">{isAr ? 'عمليات التشغيل المسندة' : 'Selected Operations'}</span>
              <Truck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {myOperations.filter((op) => ['offer_selected', 'awarded', 'in_progress', 'delivered'].includes(op.status)).length}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{isAr ? 'طلبات فازت ورشتك بتنفيذها' : 'Awarded work in execution'}</span>
          </Card>

          <Card
            onClick={() => {
              setActiveSubTab('my_operations');
              loadMyOperations();
            }}
            className="p-4 cursor-pointer transition-all border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">{isAr ? 'العمليات المكتملة' : 'Completed Operations'}</span>
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {myOperations.filter((op) => op.status === 'completed').length}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{isAr ? 'أوامر قص تم تسليمها بنجاح' : 'Delivered & finalized orders'}</span>
          </Card>
        </div>
      )}

      {/* 2. Sub-Tabs & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold w-fit">
          <button
            onClick={() => setActiveSubTab('my_rfqs')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'my_rfqs'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isAr ? 'طلباتي للقص' : 'My Requests'}</span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.2 rounded-full font-mono">
              {myRfqs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('rfqs')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'rfqs'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{isAr ? 'الطلبات المتاحة' : 'Available RFQs'}</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-mono">
              {rfqs.length}
            </span>
          </button>

          {eligibilityData?.is_provider_eligible !== false && (
            <>
              <button
                onClick={() => {
                  setActiveSubTab('my_bids');
                  loadMyBids();
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeSubTab === 'my_bids'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                <span>{isAr ? 'عروضي المقدمة' : 'My Bids'}</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded-full font-mono">
                  {myBids.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveSubTab('my_operations');
                  loadMyOperations();
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeSubTab === 'my_operations'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isAr ? 'العمليات المسندة' : 'My Operations'}</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded-full font-mono">
                  {myOperations.length}
                </span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveSubTab('workshops')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'workshops'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isAr ? 'دليل الورش' : 'Workshops'}</span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.2 rounded-full font-mono">
              {workshops.length}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === 'rfqs' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setRfqStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  rfqStatusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isAr ? 'الكل' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setRfqStatusFilter('published')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  rfqStatusFilter === 'published'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isAr ? 'السوق النشط' : 'Active Market'}
              </button>
              <button
                type="button"
                onClick={() => setRfqStatusFilter('drafts')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  rfqStatusFilter === 'drafts'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isAr ? 'مسوداتي الخاصة' : 'My Drafts'}
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في الطلبات أو الورش...' : 'Search...'}
              className="ps-8 pe-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs w-48 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={selectedServiceFilter}
            onChange={(e) => setSelectedServiceFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 px-3 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{isAr ? 'جميع التخصصات' : 'All Specialties'}</option>
            <option value="full_cmt">{isAr ? 'تصنيع كامل (CMT)' : 'Full CMT'}</option>
            <option value="sewing">{isAr ? 'خياطة وتجميع' : 'Sewing'}</option>
            <option value="cutting">{isAr ? 'قص للغير' : 'Cutting'}</option>
            <option value="embroidery">{isAr ? 'تطريز آلي' : 'Embroidery'}</option>
            <option value="printing">{isAr ? 'طباعة سلك سكرين' : 'Printing'}</option>
          </select>
        </div>
      </div>

      {/* 3. Operational Integrity Banner */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>
            {isAr
              ? 'الترسية المباشرة: قبول أي عرض يحوله تلقائياً إلى أمر تشغيل رسمي JobOrder داخل حسابك مع عزل أمانات الأقمشة وعمولة منصة 3% فقط.'
              : 'Seamless ERP Conversion: Awarding a bid generates an isolated JobOrder under your CMT custody ledger (3% commission).'}
          </span>
        </div>
      </div>

      {/* 4. P5: MY CUTTING REQUESTS (REQUESTER MINI DASHBOARD VIEW) */}
      {activeSubTab === 'my_rfqs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0f1523]/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-indigo-500" />
                <span>{isAr ? 'طلبات القص الخاصة بي ومتابعة العروض' : 'My Cutting Requests & Offer Tracking'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'استعرض جميع طلباتك، قارن عروض الأسعار المقدمة، وأدر الترسية والتسليم النهائي.'
                  : 'Track your cutting RFQs, review incoming bids, and manage awards and final deliveries.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingDraftRfq(null);
                setIsCreateCuttingModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Scissors className="w-3.5 h-3.5 me-1.5" />
              <span>{isAr ? 'طرح طلب قص فني جديد' : 'New Cutting RFQ'}</span>
            </Button>
          </div>

          {myRfqs.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'لم تقم بطرح أي طلبات قص بعد' : 'No cutting requests created yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isAr
                  ? 'اطرح طلب قص جديد لموديلاتك بدقة لاستقبال عروض الأسعار من صالات القص المعتمدة.'
                  : 'Post a new cutting request with technical specifications to receive quotes from verified workshops.'}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingDraftRfq(null);
                  setIsCreateCuttingModalOpen(true);
                }}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Scissors className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'طرح أول طلب قص فني' : 'Create First Cutting RFQ'}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRfqs.map((rfq) => {
                const bidsCount = rfq.bids_count ?? (rfq.bids?.length || 0);
                const isDelivered = rfq.status === 'delivered';
                const isAwarded = ['offer_selected', 'awarded', 'in_progress', 'delivered', 'completed'].includes(rfq.status);
                const winningBid = rfq.bids?.find((b: any) => b.status === 'accepted' || b.is_selected);

                return (
                  <Card
                    key={rfq.id}
                    className="p-4 sm:p-5 flex flex-col justify-between bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                              {rfq.title}
                            </h3>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                            #{rfq.rfq_number || rfq.id.slice(0, 8)} •{' '}
                            {new Date(rfq.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {rfq.status === 'draft' && (
                            <Badge variant="neutral" className="text-[10px]">
                              {isAr ? 'مسودة خاصة' : 'Draft'}
                            </Badge>
                          )}
                          {(rfq.status === 'open' || rfq.status === 'published') && (
                            <Badge variant="info" className="text-[10px]">
                              {isAr ? 'منشور بالسوق' : 'Published'}
                            </Badge>
                          )}
                          {(rfq.status === 'offer_selected' || rfq.status === 'awarded') && (
                            <Badge variant="warning" className="text-[10px]">
                              {isAr ? 'تم اختيار العرض' : 'Offer Selected'}
                            </Badge>
                          )}
                          {rfq.status === 'in_progress' && (
                            <Badge variant="purple" className="text-[10px]">
                              {isAr ? 'جاري التشغيل والقص' : 'In Progress'}
                            </Badge>
                          )}
                          {rfq.status === 'delivered' && (
                            <Badge variant="success" className="text-[10px]">
                              {isAr ? 'تم التوريد والتسليم' : 'Delivered'}
                            </Badge>
                          )}
                          {rfq.status === 'completed' && (
                            <Badge variant="success" className="text-[10px]">
                              {isAr ? 'مكتمل ومغلق' : 'Completed'}
                            </Badge>
                          )}
                          {rfq.status === 'cancelled' && (
                            <Badge variant="danger" className="text-[10px]">
                              {isAr ? 'ملغي' : 'Cancelled'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Specs */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>
                          <span className="text-slate-400 block text-[10px]">{isAr ? 'الكمية المطلوبة' : 'Quantity'}</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            {Number(rfq.target_quantity).toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{isAr ? 'نوع القماش' : 'Fabric Type'}</span>
                          <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {rfq.fabric_type || (isAr ? 'حسب المواصفات' : 'As per specs')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{isAr ? 'موعد التسليم المطلوب' : 'Target Date'}</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            {rfq.delivery_target_date || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{isAr ? 'العروض المستلمة' : 'Bids Received'}</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            {bidsCount} {isAr ? 'عرض' : 'bids'}
                          </span>
                        </div>
                      </div>

                      {/* Awarded Info if offer is selected */}
                      {isAwarded && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>
                              {isAr ? 'الورشة المنفذة:' : 'Workshop:'}{' '}
                              <strong>{winningBid?.workshop?.workshop_name || (isAr ? 'ورشة معتمدة' : 'Verified Workshop')}</strong>
                            </span>
                          </div>
                          {winningBid?.unit_rate && (
                            <span className="font-mono font-bold">
                              {winningBid.unit_rate} {isAr ? 'ج.م/قطعة' : 'EGP/pc'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCuttingRfq(rfq);
                          setIsCuttingDetailsModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 me-1 text-slate-500" />
                        <span>{isAr ? 'تفاصيل الطلب والعروض' : 'Details & Bids'}</span>
                        {bidsCount > 0 && (
                          <span className="ms-1.5 px-1.5 py-0.2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full font-mono font-bold text-[10px]">
                            {bidsCount}
                          </span>
                        )}
                      </Button>

                      <div className="flex items-center gap-2">
                        {rfq.status === 'draft' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingDraftRfq(rfq);
                                setIsCreateCuttingModalOpen(true);
                              }}
                              className="text-xs"
                            >
                              {isAr ? 'تعديل' : 'Edit'}
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={async () => {
                                try {
                                  await api.waslatWorsh.publishRfq(rfq.id, { accept_terms: true });
                                  setStatusMsg({
                                    type: 'success',
                                    text: isAr ? 'تم نشر طلب القص في السوق بنجاح!' : 'Cutting RFQ published!',
                                  });
                                  await loadData();
                                } catch (err: any) {
                                  setStatusMsg({ type: 'error', text: err?.message || 'فشل النشر' });
                                }
                              }}
                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              {isAr ? 'نشر في السوق' : 'Publish'}
                            </Button>
                          </>
                        )}

                        {isDelivered && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleUpdateOperationStatus(rfq.id, 'completed')}
                            disabled={isUpdatingOpStatus === rfq.id}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isAr ? 'تأكيد استلام الطلب وإنهاء العملية' : 'Confirm Delivery & Complete'}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. RFQs TAB CONTENT */}
      {activeSubTab === 'rfqs' && (
        <div className="space-y-4">
          {rfqs.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'لا توجد طلبات تشغيل مطروحة حالياً' : 'No active RFQs found'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isAr ? 'كن أول من يطرح طلب تشغيل لاستقبال عروض الأسعار من الورش.' : 'Be the first to publish an RFQ.'}
              </p>
              <Button variant="primary" size="sm" onClick={() => setIsCreateRfqModalOpen(true)} className="mt-4">
                <Plus className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'طرح طلب تشغيل جديد' : 'Publish New RFQ'}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rfqs.map((rfq) => (
                <Card
                  key={rfq.id}
                  className="p-5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-primary">
                            {rfq.rfq_number}
                          </span>
                          {getServiceBadge(rfq.service_type)}
                          <Badge
                            variant={
                              rfq.status === 'draft'
                                ? 'neutral'
                                : (rfq.status === 'open' || rfq.status === 'published')
                                ? 'success'
                                : rfq.status === 'cancelled'
                                ? 'danger'
                                : 'brand'
                            }
                            className="text-[10px]"
                          >
                            {rfq.status === 'draft'
                              ? (isAr ? 'مسودة خاصة' : 'Draft')
                              : (rfq.status === 'open' || rfq.status === 'published')
                              ? (isAr ? 'مفتوح للعروض' : 'Open')
                              : rfq.status === 'cancelled'
                              ? (isAr ? 'ملغي' : 'Cancelled')
                              : (isAr ? 'تمت الترسية' : 'Awarded')}
                          </Badge>
                          {rfq.is_owner && (
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                              {isAr ? 'طلبي' : 'Mine'}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                          {rfq.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {rfq.specifications}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                      <div>
                        <span className="block text-slate-400">{isAr ? 'الكمية المطلوبة' : 'Quantity'}</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">{rfq.target_quantity.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">{isAr ? 'الموعد الأقصى' : 'Deadline'}</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">{rfq.expected_delivery_date}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">{isAr ? 'الميزانية التقديرية' : 'Max Budget'}</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {rfq.max_budget_per_piece ? `${rfq.max_budget_per_piece} ${isAr ? 'ج.م' : 'EGP'}` : (isAr ? 'تفاوض حر' : 'Open')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rfq.bids ? rfq.bids.length : 0} {isAr ? 'عروض مقدمة' : 'Bids'}</span>
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCuttingRfq(rfq);
                          setIsCuttingDetailsModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 me-1 text-primary" />
                        {isAr ? 'المواصفات' : 'Specs'}
                      </Button>

                      {rfq.status === 'draft' && rfq.is_owner ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingDraftRfq(rfq);
                              setIsCreateCuttingModalOpen(true);
                            }}
                            className="text-xs"
                          >
                            {isAr ? 'تعديل' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={async () => {
                              try {
                                await api.waslatWorsh.publishRfq(rfq.id, { accept_terms: true });
                                setStatusMsg({
                                  type: 'success',
                                  text: isAr ? 'تم نشر الطلب في السوق بنجاح!' : 'Published successfully!',
                                });
                                await loadData();
                              } catch (err: any) {
                                setStatusMsg({ type: 'error', text: err.message || 'فشل النشر' });
                              }
                            }}
                            className="text-xs"
                          >
                            {isAr ? 'نشر' : 'Publish'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReviewBids(rfq)}
                            className="text-xs"
                          >
                            {isAr ? 'العروض' : 'Bids'}
                          </Button>

                          {(rfq.status === 'open' || rfq.status === 'published') && !rfq.is_owner && eligibilityData?.provider?.is_eligible !== false && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setSelectedRfq(rfq);
                                setIsSubmitBidModalOpen(true);
                              }}
                              className="text-xs"
                            >
                              {isAr ? 'تقديم عرض' : 'Submit Bid'}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. WORKSHOP DIRECTORY CONTENT */}
      {activeSubTab === 'workshops' && (
        <div className="space-y-4">
          {eligibilityData?.provider?.is_eligible === false && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {isAr
                    ? 'تسجيل صالات القص وتقديم عروض الأسعار محصور حصرياً في مصانع الملابس المشتركة في باقة Enterprise والموثقة إدارياً.'
                    : 'Registering cutting workshops and submitting bids is exclusive to verified Enterprise apparel factories.'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (onNavigateToSubscription ? onNavigateToSubscription() : (window.location.hash = '#/subscription'))}
                className="border-amber-500 text-amber-400 hover:bg-amber-500/10 text-xs shrink-0"
              >
                {isAr ? 'ترقية لباقة Enterprise' : 'Upgrade to Enterprise'}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workshops.map((ws) => (
            <Card
              key={ws.id}
              className="p-5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {ws.workshop_name}
                      </h3>
                      {ws.is_verified && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getServiceBadge(ws.specialty_type)}
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500 font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{ws.rating_average}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{ws.governorate} {ws.city ? `• ${ws.city}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{ws.contact_person}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{ws.phone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                  <div>
                    <span className="block text-slate-400">{isAr ? 'عدد الماكينات' : 'Machines'}</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{ws.active_machines_count} {isAr ? 'ماكينة' : 'units'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">{isAr ? 'الطاقة اليومية' : 'Daily Output'}</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{ws.daily_capacity_pieces} {isAr ? 'قطعة/يوم' : 'pcs/day'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{ws.completed_jobs_count} {isAr ? 'أمر منجز بنجاح' : 'jobs completed'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{isAr ? 'ورشة جاهزة للتشغيل' : 'Ready'}</span>
              </div>
            </Card>
          ))}
          </div>
        </div>
      )}

      {/* P4: SUB-TAB: MY SUBMITTED OFFERS */}
      {activeSubTab === 'my_bids' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <span>{isAr ? 'عروض الأسعار المقدمة من مصنعي' : 'My Submitted Cutting Offers'}</span>
            </h2>
            <Button size="sm" variant="outline" onClick={loadMyBids} disabled={isMyBidsLoading}>
              <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${isMyBidsLoading ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث' : 'Refresh'}</span>
            </Button>
          </div>

          {isMyBidsLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">{isAr ? 'جارِ جلب عروض الأسعار...' : 'Loading offers...'}</p>
            </div>
          ) : myBids.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'لم تقدم أي عروض أسعار بعد.' : 'No bids submitted yet.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isAr ? 'تصفح طلبات القص المفتوحة في السوق وقدم عروض أسعار منافسة.' : 'Browse active cutting requests and submit competitive bids.'}
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveSubTab('rfqs')} className="mt-4">
                <Scissors className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'تصفح طلبات القص المتاحة' : 'Browse Available Requests'}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myBids.map((bid) => (
                <Card
                  key={bid.id}
                  className="p-5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-primary">
                          {bid.rfq_number || 'RFQ'}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                          {bid.rfq_title}
                        </h3>
                      </div>
                      <Badge
                        variant={
                          bid.is_winner
                            ? 'success'
                            : bid.lost_to_another
                            ? 'danger'
                            : bid.status === 'withdrawn'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {bid.is_winner
                          ? (isAr ? 'عرض فائز (تمت الترسية)' : 'Winning Bid')
                          : bid.lost_to_another
                          ? (isAr ? 'تم اختيار عرض آخر' : 'Lost to Another')
                          : bid.status === 'withdrawn'
                          ? (isAr ? 'مسحوب' : 'Withdrawn')
                          : (isAr ? 'قيد المراجعة' : 'Under Review')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isAr ? 'سعر القطعة المعروض:' : 'Unit Rate:'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          {bid.unit_rate} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isAr ? 'إجمالي العرض التقديري:' : 'Total Amount:'}</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                          {bid.total_amount?.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isAr ? 'مدة التوريد المتعهد بها:' : 'Lead Days:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                          {bid.promised_lead_days} {isAr ? 'أيام' : 'days'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isAr ? 'الورشة التابعة:' : 'Workshop:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {bid.workshop_name || '-'}
                        </span>
                      </div>
                    </div>

                    {bid.notes && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg line-clamp-2">
                        {bid.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isAr ? 'تاريخ التقديم: ' : 'Submitted: '}{bid.created_at ? new Date(bid.created_at).toLocaleDateString() : ''}
                    </span>

                    {bid.can_withdraw && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWithdrawBid(bid.id)}
                        disabled={isWithdrawingBid === bid.id}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:border-rose-300"
                      >
                        <XCircle className="w-3.5 h-3.5 me-1" />
                        <span>{isWithdrawingBid === bid.id ? (isAr ? 'جارِ السحب...' : 'Withdrawing...') : (isAr ? 'سحب العرض' : 'Withdraw')}</span>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* P4: SUB-TAB: SELECTED OPERATIONS */}
      {activeSubTab === 'my_operations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-500" />
              <span>{isAr ? 'عمليات التشغيل والقص المسندة لمصنعي' : 'Awarded Operations & Cutting Work'}</span>
            </h2>
            <Button size="sm" variant="outline" onClick={loadMyOperations} disabled={isMyOperationsLoading}>
              <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${isMyOperationsLoading ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث' : 'Refresh'}</span>
            </Button>
          </div>

          {isMyOperationsLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">{isAr ? 'جارِ جلب العمليات التشغيلية...' : 'Loading operations...'}</p>
            </div>
          ) : myOperations.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'لا توجد عمليات تشغيل مسندة لورشتك حالياً.' : 'No active awarded operations.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isAr ? 'عند اختيار أحد عروضك من قبل صاحب الطلب، ستظهر العملية هنا لمتابعة مراحل التشغيل والتسليم.' : 'When a requester selects your offer, the cutting job order will appear here.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {myOperations.map((op) => (
                <Card
                  key={op.id}
                  className="p-5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary">{op.rfq_number}</span>
                        <Badge
                          variant={
                            op.status === 'completed'
                              ? 'success'
                              : op.status === 'delivered'
                              ? 'brand'
                              : op.status === 'in_progress'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {op.status === 'completed'
                            ? (isAr ? 'مكتمل ومؤكد' : 'Completed')
                            : op.status === 'delivered'
                            ? (isAr ? 'تم تسليم القص' : 'Delivered')
                            : op.status === 'in_progress'
                            ? (isAr ? 'قيد التشغيل والقص' : 'In Progress')
                            : (isAr ? 'تم اختيار العرض' : 'Offer Selected')}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{op.title}</h3>
                    </div>

                    <div className="text-end font-mono">
                      <span className="text-xs text-slate-400 block">{isAr ? 'القيمة المتفق عليها:' : 'Agreed Total:'}</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {op.agreed_total_price?.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({op.unit_rate} {isAr ? 'ج.م / قطعة' : 'EGP / pc'})
                      </span>
                    </div>
                  </div>

                  {/* Operation Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الكمية المطلوبة' : 'Quantity'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {op.target_quantity?.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'موعد التسليم المتعهد به' : 'Deadline'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {op.expected_delivery_date || '-'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'موقع الاستلام' : 'Pickup'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {op.logistics_summary?.pickup_governorate || '-'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الورشة المنفذة' : 'Workshop'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {op.workshop_name || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Operational Status Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500">
                      {op.status === 'offer_selected' || op.status === 'awarded' ? (
                        <span className="text-amber-500 font-bold">{isAr ? 'الخطوة التالية: بدء التشغيل الفعلي واستلام الخامات' : 'Next: Start processing & fabric receipt'}</span>
                      ) : op.status === 'in_progress' ? (
                        <span className="text-indigo-500 font-bold">{isAr ? 'الخطوة التالية: إتمام القص وتسجيل التسليم' : 'Next: Complete cutting & mark delivered'}</span>
                      ) : op.status === 'delivered' ? (
                        <span className="text-emerald-500 font-bold">{isAr ? 'تم التسليم: بانتظار فحص صاحب الطلب وتأكيد الاستلام النهائي' : 'Delivered: Waiting for requester sign-off'}</span>
                      ) : (
                        <span className="text-slate-400 font-bold">{isAr ? 'العملية مكتملة ومغلقة بنجاح' : 'Order completed and finalized'}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(op.status === 'offer_selected' || op.status === 'awarded') && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateOperationStatus(op.id, 'in_progress')}
                          disabled={isUpdatingOpStatus === op.id}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                          <Scissors className="w-3.5 h-3.5 me-1" />
                          <span>{isUpdatingOpStatus === op.id ? (isAr ? 'جارِ التحديث...' : 'Updating...') : (isAr ? 'بدء التشغيل والقص' : 'Start Cutting')}</span>
                        </Button>
                      )}

                      {op.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateOperationStatus(op.id, 'delivered')}
                          disabled={isUpdatingOpStatus === op.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <Truck className="w-3.5 h-3.5 me-1" />
                          <span>{isUpdatingOpStatus === op.id ? (isAr ? 'جارِ التسجيل...' : 'Recording...') : (isAr ? 'تسجيل تسليم القص' : 'Mark Delivered')}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE RFQ */}
      <Modal
        isOpen={isCreateRfqModalOpen}
        onClose={() => setIsCreateRfqModalOpen(false)}
        title={isAr ? 'طرح طلب تشغيل للغير (New RFQ)' : 'Publish Manufacturing RFQ'}
      >
        <form onSubmit={handleCreateRfq} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'عنوان الطلب والموديل *' : 'RFQ Title *'}
            </label>
            <input
              type="text"
              value={rfqTitle}
              onChange={(e) => setRfqTitle(e.target.value)}
              placeholder={isAr ? 'مثال: تشغيل 3000 قطعة سويت شيرت ميلتون' : 'e.g. 3,000 Pcs Fleece Hoodies'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع التشغيل المطلوب *' : 'Service Type *'}
              </label>
              <select
                value={rfqServiceType}
                onChange={(e) => setRfqServiceType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="full_cmt">{isAr ? 'تصنيع كامل (CMT)' : 'Full CMT'}</option>
                <option value="sewing">{isAr ? 'خياطة وتجميع' : 'Sewing Only'}</option>
                <option value="cutting">{isAr ? 'قص للغير' : 'Contract Cutting'}</option>
                <option value="embroidery">{isAr ? 'تطريز آلي' : 'Embroidery'}</option>
                <option value="printing">{isAr ? 'طباعة سلك سكرين' : 'Screen Printing'}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الكمية المستهدفة (قطعة) *' : 'Target Quantity (pcs) *'}
              </label>
              <input
                type="number"
                min="10"
                value={rfqQuantity}
                onChange={(e) => setRfqQuantity(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'أقصى ميزانية للقطعة (اختياري)' : 'Max Budget / Pc (EGP)'}
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={rfqBudget}
                onChange={(e) => setRfqBudget(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ التسليم الأقصى *' : 'Delivery Deadline *'}
              </label>
              <input
                type="date"
                value={rfqDeliveryDate}
                onChange={(e) => setRfqDeliveryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مسؤولية توفير الأقمشة *' : 'Fabric Custody *'}
            </label>
            <select
              value={rfqFabricResp}
              onChange={(e) => setRfqFabricResp(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="seeker_provided">{isAr ? 'قماش أمانة من طرف صاحب العمل (Seeker Provided)' : 'Customer Provided Fabric'}</option>
              <option value="workshop_sourced">{isAr ? 'توريد القماش على عاتق الورشة (Workshop Sourced)' : 'Workshop Sourced Fabric'}</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المواصفات الفنية وشروط الجودة *' : 'Specifications & Quality Notes *'}
            </label>
            <textarea
              rows={3}
              value={rfqSpecs}
              onChange={(e) => setRfqSpecs(e.target.value)}
              placeholder={isAr ? 'اكتب تفاصيل الخامة، مراحل الحياكة المطلوبة، والمقاسات...' : 'Details about seams, samples, fabric weight...'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsCreateRfqModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingRfq}>
              {isSubmittingRfq ? (isAr ? 'جارِ النشر...' : 'Publishing...') : (isAr ? 'نشر الطلب في السوق' : 'Publish RFQ')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: SUBMIT BID */}
      <Modal
        isOpen={isSubmitBidModalOpen}
        onClose={() => setIsSubmitBidModalOpen(false)}
        title={isAr ? `تقديم عرض سعر: ${selectedRfq?.title || ''}` : `Submit Quotation: ${selectedRfq?.title || ''}`}
      >
        <form onSubmit={handleSubmitBid} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اختر الورشة / المشغل التابع لك *' : 'Select Workshop *'}
            </label>
            <select
              value={bidWorkshopId}
              onChange={(e) => setBidWorkshopId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              required
            >
              {workshops.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.workshop_name} ({ws.governorate} - {ws.daily_capacity_pieces} قط/يوم)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'سعر تشغيل القطعة (ج.م) *' : 'Unit Rate (EGP/pc) *'}
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={bidUnitRate}
                onChange={(e) => setBidUnitRate(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مدة التوريد المتعهد بها (أيام) *' : 'Promised Lead Time (Days) *'}
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={bidLeadDays}
                onChange={(e) => setBidLeadDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات العرض والعينات' : 'Quotation Notes & Samples'}
            </label>
            <textarea
              rows={3}
              value={bidNotes}
              onChange={(e) => setBidNotes(e.target.value)}
              placeholder={isAr ? 'مستعدون لتقديم عينة فحص مطابقة وتأكيد إمكانية العمل بورديتين...' : 'Notes on machinery, sample dispatch...'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsSubmitBidModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingBid}>
              {isSubmittingBid ? (isAr ? 'جارِ الإرسال...' : 'Submitting...') : (isAr ? 'إرسال العرض' : 'Submit Bid')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: REVIEW BIDS & AWARD JOB ORDER */}
      <Modal
        isOpen={isReviewBidsModalOpen}
        onClose={() => setIsReviewBidsModalOpen(false)}
        title={isAr ? `العروض المقدمة للطلب: ${selectedRfqDetails?.rfq_number || ''}` : `Review Bids: ${selectedRfqDetails?.rfq_number || ''}`}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white">{selectedRfqDetails?.title}</h4>
            <div className="flex gap-4 text-slate-500 mt-1">
              <span>{isAr ? 'الكمية:' : 'Qty:'} <strong className="text-slate-700 dark:text-slate-200">{selectedRfqDetails?.target_quantity.toLocaleString()}</strong></span>
              <span>{isAr ? 'الموعد:' : 'Deadline:'} <strong className="text-slate-700 dark:text-slate-200">{selectedRfqDetails?.expected_delivery_date}</strong></span>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-xs text-slate-900 dark:text-white">
              {isAr ? `العروض المقدمة (${selectedRfqDetails?.bids?.length || 0}):` : `Bids (${selectedRfqDetails?.bids?.length || 0}):`}
            </h5>

            {!selectedRfqDetails?.bids || selectedRfqDetails.bids.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {isAr ? 'لم يتم تقديم عروض أسعار لهذا الطلب حتى الآن.' : 'No bids submitted yet.'}
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {selectedRfqDetails.bids.map((bid) => {
                  const isAccepted = bid.status === 'accepted';
                  return (
                    <div
                      key={bid.id}
                      className={`p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-4 ${
                        isAccepted
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {bid.workshop?.workshop_name || 'ورشة تصنيع'}
                          </span>
                          {bid.workshop?.is_verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span className="text-[10px] text-amber-500 font-bold font-mono">
                            ★ {bid.workshop?.rating_average || '5.0'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isAr ? 'مدة التوريد:' : 'Lead Time:'} <strong className="text-slate-700 dark:text-slate-300">{bid.promised_lead_days} {isAr ? 'أيام' : 'days'}</strong>
                          {bid.notes ? ` • "${bid.notes}"` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-end">
                          <div className="text-base font-black text-primary font-mono">
                            {bid.unit_rate} <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م/قطعة' : 'EGP/pc'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {isAr ? 'الإجمالي:' : 'Total:'} {(bid.unit_rate * (selectedRfqDetails?.target_quantity || 1)).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </div>
                        </div>

                        {selectedRfqDetails?.status === 'open' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAcceptBid(selectedRfqDetails.id, bid.id)}
                            className="text-xs"
                          >
                            {isAr ? 'قبول وترسية' : 'Award'}
                          </Button>
                        )}

                        {isAccepted && (
                          <Badge variant="success" className="text-xs">
                            {isAr ? 'العرض الفائز' : 'Awarded'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL 4: CREATE WORKSHOP */}
      <Modal
        isOpen={isCreateWorkshopModalOpen}
        onClose={() => setIsCreateWorkshopModalOpen(false)}
        title={isAr ? 'تسجيل ورشة / مشغل في دليل وصلة ورش' : 'Register Workshop in Directory'}
      >
        <form onSubmit={handleCreateWorkshop} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الورشة أو المشغل *' : 'Workshop Name *'}
            </label>
            <input
              type="text"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder={isAr ? 'مثال: مشغل الفردوس لتطريز الملابس' : 'e.g. Al-Ferdous Embroidery'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'التخصص الصناعي *' : 'Specialty *'}
              </label>
              <select
                value={wsSpecialty}
                onChange={(e) => setWsSpecialty(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="full_cmt">{isAr ? 'تصنيع كامل (CMT)' : 'Full CMT'}</option>
                <option value="sewing">{isAr ? 'خياطة وتجميع' : 'Sewing'}</option>
                <option value="cutting">{isAr ? 'قص للغير' : 'Cutting'}</option>
                <option value="embroidery">{isAr ? 'تطريز آلي' : 'Embroidery'}</option>
                <option value="printing">{isAr ? 'طباعة سلك سكرين' : 'Printing'}</option>
                <option value="finishing">{isAr ? 'كي وتشطيب وتعبئة' : 'Finishing & Packing'}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المحافظة *' : 'Governorate *'}
              </label>
              <select
                value={wsGovernorate}
                onChange={(e) => setWsGovernorate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="القاهرة">القاهرة</option>
                <option value="الجيزة">الجيزة</option>
                <option value="القليوبية (شبرا الخيمة)">القليوبية (شبرا الخيمة)</option>
                <option value="الغربية (المحلة الكبرى)">الغربية (المحلة الكبرى)</option>
                <option value="الإسكندرية">الإسكندرية</option>
                <option value="بورسعيد">بورسعيد</option>
                <option value="الشرقية (العاشر من رمضان)">الشرقية (العاشر من رمضان)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المدينة / الحي' : 'City / District'}
              </label>
              <input
                type="text"
                value={wsCity}
                onChange={(e) => setWsCity(e.target.value)}
                placeholder={isAr ? 'مثال: مدينة نصر، شبرا...' : 'e.g. Nasr City, Shubra...'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'عدد الماكينات الشغالة *' : 'Active Machines *'}
              </label>
              <input
                type="number"
                min="1"
                value={wsMachines}
                onChange={(e) => setWsMachines(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الطاقة الإنتاجية اليومية (قطعة) *' : 'Daily Output (pcs) *'}
              </label>
              <input
                type="number"
                min="10"
                value={wsDailyCapacity}
                onChange={(e) => setWsDailyCapacity(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم الهاتف للتواصل *' : 'Phone *'}
              </label>
              <input
                type="text"
                value={wsPhone}
                onChange={(e) => setWsPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم المسؤول / الأسطى *' : 'Contact Person *'}
              </label>
              <input
                type="text"
                value={wsContactPerson}
                onChange={(e) => setWsContactPerson(e.target.value)}
                placeholder={isAr ? 'الأسطى أحمد' : 'Ahmed'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsCreateWorkshopModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingWorkshop}>
              {isSubmittingWorkshop ? (isAr ? 'جارِ التسجيل...' : 'Registering...') : (isAr ? 'تسجيل الورشة' : 'Register Workshop')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* STAGE C MODALS: CUTTING REQUEST CREATION & TECHNICAL DETAILS */}
      <CreateCuttingRequestModal
        isOpen={isCreateCuttingModalOpen}
        onClose={() => {
          setIsCreateCuttingModalOpen(false);
          setEditingDraftRfq(null);
        }}
        isAr={isAr}
        editingRfq={editingDraftRfq}
        onSuccess={(_savedRfq, published) => {
          setStatusMsg({
            type: 'success',
            text: published
              ? (isAr ? 'تم طرح ونشر طلب القص في سوق وصلة ورش بنجاح!' : 'Cutting RFQ published!')
              : (isAr ? 'تم حفظ مسودة طلب القص بنجاح.' : 'Cutting draft saved.'),
          });
          loadData();
        }}
      />

      <CuttingRequestDetailsModal
        isOpen={isCuttingDetailsModalOpen}
        onClose={() => {
          setIsCuttingDetailsModalOpen(false);
          setSelectedCuttingRfq(null);
        }}
        rfq={selectedCuttingRfq}
        isAr={isAr}
        onPublishSuccess={() => {
          setIsCuttingDetailsModalOpen(false);
          loadData();
        }}
        onCancelSuccess={() => {
          setIsCuttingDetailsModalOpen(false);
          loadData();
        }}
        onOpenBidModal={(rfqToBid) => {
          setIsCuttingDetailsModalOpen(false);
          setSelectedRfq(rfqToBid);
          setIsSubmitBidModalOpen(true);
        }}
        onEditDraft={(draftToEdit) => {
          setIsCuttingDetailsModalOpen(false);
          setEditingDraftRfq(draftToEdit);
          setIsCreateCuttingModalOpen(true);
        }}
        onAcceptBid={async (rfqId, bidId) => {
          await handleAcceptBid(rfqId, bidId);
          setIsCuttingDetailsModalOpen(false);
        }}
        onCompleteOrder={async (rfqId) => {
          await handleUpdateOperationStatus(rfqId, 'completed');
          setIsCuttingDetailsModalOpen(false);
        }}
      />

      {/* MODAL: BUY WASLAT WORSH RFQ PACK */}
      <Modal
        isOpen={isBuyPackModalOpen}
        onClose={() => setIsBuyPackModalOpen(false)}
        title={isAr ? 'شراء باقة طلبات قص منفصلة — سوق وصلة ورش' : 'Buy Waslat Worsh RFQ Quota Pack'}
        maxWidth="lg"
      >
        <form onSubmit={handleBuyPackSubmit} className="space-y-4 text-xs">
          {paymentMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold ${
                paymentMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              {paymentMsg.text}
            </div>
          )}

          <div className="space-y-2">
            <label className="font-bold block text-slate-800 dark:text-slate-200">
              {isAr ? 'اختر باقة طلبات القص المطلوبة:' : 'Select Cutting RFQ Pack:'}
            </label>
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
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white mb-1">{plan.name_ar || plan.name_en || plan.code}</div>
                    <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                      {Number(plan.monthly_price).toLocaleString()} EGP
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {isAr ? `تتضمن ${plan.quota_rfq_count} طلبات قص` : `${plan.quota_rfq_count} RFQs`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transfer Instructions */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="font-bold block text-slate-800 dark:text-slate-200">{isAr ? 'بيانات التحويل الرسمي:' : 'Transfer Details:'}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">InstaPay:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{paymentInstructions?.instapay_address || 'garmentos@instapay'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'حساب بنكي CIB:' : 'Bank Account:'}</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{paymentInstructions?.account_number || '100049281729'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{isAr ? 'طريقة السداد' : 'Payment Method'} *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="instapay">InstaPay</option>
                <option value="bank_transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{isAr ? 'رقم أو مرجع التحويل' : 'Reference'} *</label>
              <input
                type="text"
                required
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="REF-12345678"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{isAr ? 'صورة إيصال التحويل' : 'Receipt Image'} *</label>
            <input
              type="file"
              required
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 dark:file:bg-slate-800 file:text-xs"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsBuyPackModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmittingPayment} className="bg-rose-600 hover:bg-rose-500 text-white">
              {isSubmittingPayment ? (isAr ? 'جارِ الإرسال...' : 'Submitting...') : (isAr ? 'إرسال إثبات السداد' : 'Submit Proof')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
