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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { WorkshopProfile, Rfq } from '../../types';

interface WaslatWorshTabProps {
  isAr?: boolean;
}

export const WaslatWorshTab: React.FC<WaslatWorshTabProps> = ({ isAr = true }) => {
  const [activeSubTab, setActiveSubTab] = useState<'rfqs' | 'workshops'>('rfqs');
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      const [rfqRes, wsRes] = await Promise.all([
        api.waslatWorsh.getRfqs({
          service_type: selectedServiceFilter !== 'all' ? selectedServiceFilter : undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.waslatWorsh.getWorkshops({
          specialty_type: selectedServiceFilter !== 'all' ? selectedServiceFilter : undefined,
          search: searchQuery.trim() || undefined,
        }),
      ]);
      setRfqs(rfqRes.data || []);
      setWorkshops(wsRes.data || []);
      if (wsRes.data && wsRes.data.length > 0 && !bidWorkshopId) {
        setBidWorkshopId(wsRes.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load Waslat Worsh data:', err);
      // Demo fallbacks if server offline
      setRfqs([
        {
          id: 'demo-rfq-1',
          tenant_id: 'tenant-1',
          rfq_number: 'RFQ-2026-0001',
          title: isAr ? 'تشغيل 2,000 قطعة قميص بولو رجالي' : '2,000 Pcs Men Polo Shirts CMT',
          service_type: 'full_cmt',
          specifications: isAr ? 'تجميع كامل، تطريز شعار الصدر، وتوفير عينة أولية قبل الإنتاج.' : 'Full CMT assembly with chest embroidery.',
          target_quantity: 2000,
          expected_delivery_date: '2026-11-20',
          max_budget_per_piece: 28.0,
          fabric_responsibility: 'seeker_provided',
          status: 'open',
          created_at: new Date().toISOString(),
          bids: [
            {
              id: 'bid-1',
              rfq_id: 'demo-rfq-1',
              workshop_profile_id: 'ws-1',
              unit_rate: 24.5,
              promised_lead_days: 12,
              status: 'submitted',
              created_at: new Date().toISOString(),
              workshop: {
                id: 'ws-1',
                workshop_name: isAr ? 'مشغل الأمل للخياطة والتطريز' : 'Al-Amal Workshop',
                specialty_type: 'full_cmt',
                active_machines_count: 15,
                daily_capacity_pieces: 300,
                governorate: 'القاهرة',
                city: 'مدينة نصر',
                phone: '01012345678',
                contact_person: 'الأسطى محمود',
                is_verified: true,
                rating_average: 4.85,
                completed_jobs_count: 24,
                created_at: new Date().toISOString(),
              },
            },
          ],
        },
      ]);
      setWorkshops([
        {
          id: 'ws-1',
          workshop_name: isAr ? 'مشغل الأمل للخياطة والتطريز' : 'Al-Amal Workshop',
          specialty_type: 'full_cmt',
          active_machines_count: 15,
          daily_capacity_pieces: 300,
          governorate: 'القاهرة',
          city: 'مدينة نصر',
          phone: '01012345678',
          contact_person: 'الأسطى محمود',
          is_verified: true,
          rating_average: 4.85,
          completed_jobs_count: 24,
          created_at: new Date().toISOString(),
        },
        {
          id: 'ws-2',
          workshop_name: isAr ? 'ورشة الفرسان لقص الأقمشة' : 'Al-Forsan Cutting Unit',
          specialty_type: 'cutting',
          active_machines_count: 4,
          daily_capacity_pieces: 1200,
          governorate: 'الجيزة',
          city: 'أكتوبر',
          phone: '01234567890',
          contact_person: 'عماد فتحي',
          is_verified: true,
          rating_average: 4.9,
          completed_jobs_count: 48,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedServiceFilter]);

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

  return (
    <div className="space-y-6">
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

          <Button variant="outline" size="sm" onClick={() => setIsCreateWorkshopModalOpen(true)}>
            <Building2 className="w-3.5 h-3.5 me-1.5 text-indigo-500" />
            {isAr ? 'تسجيل مشغل / ورشة' : 'Register Workshop'}
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsCreateRfqModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 me-1.5" />
            {isAr ? 'طرح طلب تشغيل (RFQ)' : 'Publish RFQ'}
          </Button>
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

      {/* 2. Sub-Tabs & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold w-fit">
          <button
            onClick={() => setActiveSubTab('rfqs')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'rfqs'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{isAr ? 'سوق طلبات التشغيل (RFQs)' : 'Active RFQ Exchange'}</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-mono">
              {rfqs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('workshops')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'workshops'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'دليل الورش ومقدمي الطاقة' : 'Workshop Directory'}</span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.2 rounded-full font-mono">
              {workshops.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
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

      {/* 4. RFQs TAB CONTENT */}
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
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-primary">
                            {rfq.rfq_number}
                          </span>
                          {getServiceBadge(rfq.service_type)}
                          <Badge variant={rfq.status === 'open' ? 'success' : 'neutral'} className="text-[10px]">
                            {rfq.status === 'open' ? (isAr ? 'مفتوح للعروض' : 'Open') : (isAr ? 'تمت الترسية' : 'Awarded')}
                          </Badge>
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

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReviewBids(rfq)}
                        className="text-xs"
                      >
                        {isAr ? 'معاينة العروض' : 'View Bids'}
                      </Button>

                      {rfq.status === 'open' && (
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
    </div>
  );
};
