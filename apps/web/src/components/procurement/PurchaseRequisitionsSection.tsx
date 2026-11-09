import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { PurchaseRequisition, Warehouse, Supplier } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Plus, CheckCircle, XCircle, ArrowRightLeft, FileText, Send, Ban, RefreshCw } from 'lucide-react';

interface PurchaseRequisitionsSectionProps {
  isAr: boolean;
  warehouses: Warehouse[];
  suppliers: Supplier[];
  onPoCreated?: (newPo: any) => void;
}

export const PurchaseRequisitionsSection: React.FC<PurchaseRequisitionsSectionProps> = ({
  isAr,
  warehouses,
  suppliers,
  onPoCreated,
}) => {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedReqForConvert, setSelectedReqForConvert] = useState<PurchaseRequisition | null>(null);
  const [convertSupplierId, setConvertSupplierId] = useState('');
  const [convertWarehouseId, setConvertWarehouseId] = useState('');
  const [convertItemPrices, setConvertItemPrices] = useState<Record<string, number>>({});
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedReqForReject, setSelectedReqForReject] = useState<PurchaseRequisition | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Form State for New Requisition
  const [department, setDepartment] = useState('Purchasing');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [requiredDate, setRequiredDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ item_name: string; requested_quantity: number; unit_of_measure: string; estimated_unit_price: number; specifications?: string }>>([
    { item_name: '', requested_quantity: 1, unit_of_measure: 'pcs', estimated_unit_price: 0 },
  ]);

  const loadRequisitions = async () => {
    try {
      setIsLoading(true);
      const res = await api.procurement.getRequisitions();
      if (res && res.data) {
        setRequisitions(res.data);
      }
    } catch {
      // Ignore network errors in demo/offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequisitions();
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { item_name: '', requested_quantity: 1, unit_of_measure: 'pcs', estimated_unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.some((i) => i.item_name.trim().length > 0)) {
      alert(isAr ? 'يرجى إدخال اسم صنف واحد على الأقل.' : 'Please add at least one item.');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        department,
        priority,
        required_date: requiredDate || undefined,
        reason: reason || undefined,
        notes: notes || undefined,
        items: items.filter((i) => i.item_name.trim().length > 0),
      };

      const res = await api.procurement.createRequisition(payload);
      if (res?.data) {
        setRequisitions((prev) => [res.data, ...prev]);
        setIsCreateModalOpen(false);
        // Reset form
        setReason('');
        setNotes('');
        setItems([{ item_name: '', requested_quantity: 1, unit_of_measure: 'pcs', estimated_unit_price: 0 }]);
      }
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل إنشاء طلب الشراء' : 'Failed to create requisition'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequisition = async (id: string) => {
    try {
      const res = await api.procurement.submitRequisition(id);
      if (res?.data) {
        setRequisitions((prev) => prev.map((r) => (r.id === id ? res.data : r)));
      }
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل إرسال طلب الشراء' : 'Failed to submit requisition'));
    }
  };

  const handleApproveRequisition = async (id: string) => {
    try {
      const res = await api.procurement.approveRequisition(id);
      if (res?.data) {
        setRequisitions((prev) => prev.map((r) => (r.id === id ? res.data : r)));
      }
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل اعتماد طلب الشراء' : 'Failed to approve requisition'));
    }
  };

  const handleRejectRequisition = async () => {
    if (!selectedReqForReject || !rejectReason.trim()) {
      alert(isAr ? 'يرجى كتابة سبب الرفض.' : 'Please provide a rejection reason.');
      return;
    }
    try {
      const res = await api.procurement.rejectRequisition(selectedReqForReject.id, rejectReason);
      if (res?.data) {
        setRequisitions((prev) => prev.map((r) => (r.id === selectedReqForReject.id ? res.data : r)));
      }
      setIsRejectModalOpen(false);
      setSelectedReqForReject(null);
      setRejectReason('');
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل رفض طلب الشراء' : 'Failed to reject requisition'));
    }
  };

  const handleConvertRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForConvert || !convertSupplierId) {
      alert(isAr ? 'يرجى اختيار المورد.' : 'Please select a vendor.');
      return;
    }

    try {
      setIsLoading(true);

      const itemsPayload: Record<string, { unit_price: number }> = {};
      selectedReqForConvert.items?.forEach((it) => {
        itemsPayload[it.id] = {
          unit_price: Number(convertItemPrices[it.id] ?? (it.estimated_unit_price || 100)),
        };
      });

      const res = await api.procurement.convertRequisition(selectedReqForConvert.id, {
        supplier_id: convertSupplierId,
        warehouse_id: convertWarehouseId || undefined,
        items: itemsPayload,
      });

      if (res?.data) {
        alert(isAr ? `تم تحويل الطلب بنجاح إلى أمر شراء رقم ${res.data.po_number}` : `Successfully converted to PO #${res.data.po_number}`);
        setRequisitions((prev) =>
          prev.map((r) =>
            r.id === selectedReqForConvert.id ? { ...r, status: 'converted', converted_purchase_order_id: res.data.id } : r
          )
        );
        if (onPoCreated) {
          onPoCreated(res.data);
        }
        setIsConvertModalOpen(false);
        setSelectedReqForConvert(null);
      }
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل تحويل طلب الشراء إلى أمر شراء' : 'Failed to convert requisition'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequisition = async (id: string) => {
    const reasonPrompt = prompt(isAr ? 'يرجى ذكر سبب الإلغاء:' : 'Please enter cancellation reason:');
    if (!reasonPrompt) return;
    try {
      const res = await api.procurement.cancelRequisition(id, reasonPrompt);
      if (res?.data) {
        setRequisitions((prev) => prev.map((r) => (r.id === id ? res.data : r)));
      }
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل إلغاء طلب الشراء' : 'Failed to cancel requisition'));
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {isAr ? 'طلبات الشراء والاحتياج الداخلي (Purchase Requisitions)' : 'Purchase Requisitions (PR)'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAr
              ? 'دورة تقديم واعتماد طلبات المواد الخام ومستلزمات الإنتاج ثم تحويلها لأوامر شراء رسمية.'
              : 'Workflow for raising, approving internal material requisitions, and converting them to POs.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadRequisitions} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {isAr ? 'طلب شراء جديد' : 'New Requisition'}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-3 px-4">{isAr ? 'رقم الطلب' : 'PR #'}</th>
                <th className="py-3 px-4">{isAr ? 'القسم / مقدم الطلب' : 'Dept / Requester'}</th>
                <th className="py-3 px-4">{isAr ? 'تاريخ الطلب' : 'Req Date'}</th>
                <th className="py-3 px-4">{isAr ? 'الأولوية' : 'Priority'}</th>
                <th className="py-3 px-4">{isAr ? 'عدد الأصناف' : 'Items'}</th>
                <th className="py-3 px-4">{isAr ? 'التكلفة التقديرية' : 'Est. Cost'}</th>
                <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    {isAr ? 'لا توجد طلبات شراء مسجلة حالياً.' : 'No purchase requisitions found.'}
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{req.requisition_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {req.department || 'Purchasing'}
                      {req.requester?.name && <span className="block text-[10px] text-slate-400">{req.requester.name}</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 font-bold">{formatDate(req.requisition_date)}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          req.priority === 'urgent'
                            ? 'danger'
                            : req.priority === 'high'
                            ? 'warning'
                            : req.priority === 'medium'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {req.priority === 'urgent'
                          ? (isAr ? 'عاجل جداً' : 'Urgent')
                          : req.priority === 'high'
                          ? (isAr ? 'مرتفع' : 'High')
                          : req.priority === 'medium'
                          ? (isAr ? 'متوسط' : 'Medium')
                          : (isAr ? 'عادي' : 'Low')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-center">{req.items?.length || 0}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {(Number(req.estimated_total_cost) || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          req.status === 'converted'
                            ? 'brand'
                            : req.status === 'approved'
                            ? 'success'
                            : req.status === 'submitted'
                            ? 'info'
                            : req.status === 'rejected'
                            ? 'danger'
                            : req.status === 'cancelled'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {req.status === 'converted'
                          ? (isAr ? 'تم التحويل لأمر شراء' : 'Converted to PO')
                          : req.status === 'approved'
                          ? (isAr ? 'معتمد' : 'Approved')
                          : req.status === 'submitted'
                          ? (isAr ? 'بانتظار الاعتماد' : 'Submitted')
                          : req.status === 'rejected'
                          ? (isAr ? 'مرفوض' : 'Rejected')
                          : req.status === 'cancelled'
                          ? (isAr ? 'ملغي' : 'Cancelled')
                          : (isAr ? 'مسودة' : 'Draft')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {req.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleSubmitRequisition(req.id)}
                            title={isAr ? 'إرسال الطلب للاعتماد' : 'Submit Requisition'}
                            className="p-1.5 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-2xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(req.status === 'draft' || req.status === 'submitted') && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveRequisition(req.id)}
                              title={isAr ? 'اعتماد طلب الشراء' : 'Approve Requisition'}
                              className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReqForReject(req);
                                setIsRejectModalOpen(true);
                              }}
                              title={isAr ? 'رفض الطلب' : 'Reject Requisition'}
                              className="p-1.5 rounded-lg text-rose-600 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {req.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReqForConvert(req);
                              setConvertSupplierId(suppliers[0]?.id || '');
                              setConvertWarehouseId(warehouses[0]?.id || '');
                              const initialPrices: Record<string, number> = {};
                              req.items?.forEach((it) => {
                                initialPrices[it.id] = Number(it.estimated_unit_price) > 0 ? Number(it.estimated_unit_price) : 100;
                              });
                              setConvertItemPrices(initialPrices);
                              setIsConvertModalOpen(true);
                            }}
                            title={isAr ? 'تحويل لأمر شراء رسمي (PO)' : 'Convert to Purchase Order'}
                            className="p-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {req.status !== 'converted' && req.status !== 'cancelled' && req.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequisition(req.id)}
                            title={isAr ? 'إلغاء طلب الشراء' : 'Cancel Requisition'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE REQUISITION MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={isAr ? 'إنشاء طلب شراء داخلي جديد' : 'New Purchase Requisition'}
      >
        <form onSubmit={handleCreateRequisition} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'القسم / الإدارة' : 'Department'}
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                placeholder={isAr ? 'صالة القص / إدارة الإنتاج' : 'Cutting Floor / Production'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الأولوية' : 'Priority'}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="low">{isAr ? 'عادي (Low)' : 'Low'}</option>
                <option value="medium">{isAr ? 'متوسط (Medium)' : 'Medium'}</option>
                <option value="high">{isAr ? 'مرتفع (High)' : 'High'}</option>
                <option value="urgent">{isAr ? 'عاجل جداً (Urgent)' : 'Urgent'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ الاحتياج المطلوب' : 'Required Date'}
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'سبب أو مبرر الطلب' : 'Reason / Purpose'}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                placeholder={isAr ? 'تغذية أمر إنتاج أو نقص رصيد مخزني' : 'Feeding production order or safety stock replenishment'}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'الأصناف المطلوبة' : 'Requisition Items'}
              </h5>
              <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="h-6 text-[11px] px-2">
                <Plus className="w-3 h-3 me-1" />
                {isAr ? 'إضافة صنف' : 'Add Item'}
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
                  <input
                    type="text"
                    value={it.item_name}
                    onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                    placeholder={isAr ? 'اسم الصنف أو المادة' : 'Item Name'}
                    className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                    required
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={it.requested_quantity}
                    onChange={(e) => handleItemChange(idx, 'requested_quantity', parseFloat(e.target.value) || 0)}
                    placeholder={isAr ? 'الكمية' : 'Qty'}
                    className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono"
                    required
                  />
                  <input
                    type="text"
                    value={it.unit_of_measure}
                    onChange={(e) => handleItemChange(idx, 'unit_of_measure', e.target.value)}
                    placeholder={isAr ? 'الوحدة' : 'Unit'}
                    className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.estimated_unit_price}
                    onChange={(e) => handleItemChange(idx, 'estimated_unit_price', parseFloat(e.target.value) || 0)}
                    placeholder={isAr ? 'السعر التقديري' : 'Price'}
                    className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 hover:text-rose-700 px-1 text-sm font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات إضافية' : 'Additional Notes'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
              {isAr ? 'حفظ الطلب' : 'Save Requisition'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONVERT TO PO MODAL */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title={isAr ? 'تحويل طلب الشراء إلى أمر شراء رسمي (PO)' : 'Convert Requisition to Purchase Order'}
      >
        <form onSubmit={handleConvertRequisition} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {isAr
              ? `سيتم تحويل طلب الشراء رقم (${selectedReqForConvert?.requisition_number}) إلى أمر شراء رسمي موجه للمورد المحدد مع استيفاء أرصدة الأصناف.`
              : `Converting requisition #${selectedReqForConvert?.requisition_number} into an official purchase order.`}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المورد المعتمد *' : 'Approved Vendor *'}
            </label>
            <select
              value={convertSupplierId}
              onChange={(e) => setConvertSupplierId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              required
            >
              <option value="">{isAr ? '-- اختر المورد --' : '-- Select Vendor --'}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المستودع المستهدف للاستلام' : 'Target Receiving Warehouse'}
            </label>
            <select
              value={convertWarehouseId}
              onChange={(e) => setConvertWarehouseId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          {/* Requisition Items Price Confirmation (الكمية × السعر) */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'تأكيد أسعار الشراء للأصناف (الكمية × سعر الوحدة):' : 'Confirm Purchase Prices (Qty × Unit Price):'}
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(selectedReqForConvert?.items || []).map((it) => {
                const qty = Number(it.requested_quantity || 1);
                const price = Number(convertItemPrices[it.id] ?? (it.estimated_unit_price || 100));
                const lineTotal = qty * price;
                return (
                  <div key={it.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">{it.item_name}</span>
                      <span className="text-slate-500 text-[11px] font-mono">{qty} {it.unit_of_measure}</span>
                    </div>

                    <div className="w-28 shrink-0">
                      <label className="block text-[10px] text-slate-500 mb-0.5">{isAr ? 'سعر الوحدة (ج.م)' : 'Unit Price'}</label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={price}
                        onChange={(e) => setConvertItemPrices(prev => ({ ...prev, [it.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-1.5 font-mono text-center text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>

                    <div className="w-28 shrink-0 text-left">
                      <label className="block text-[10px] text-slate-500 mb-0.5">{isAr ? 'إجمالي البند' : 'Line Total'}</label>
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 block pt-1">
                        {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsConvertModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isLoading || !convertSupplierId}>
              {isAr ? 'إصدار أمر الشراء الآن' : 'Issue Purchase Order'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title={isAr ? 'رفض طلب الشراء' : 'Reject Requisition'}
      >
        <div className="space-y-4">
          <p className="text-xs text-rose-600 dark:text-rose-400">
            {isAr ? 'سبب رفض طلب الشراء إلزامي لحفظ مسار التدقيق الرقابي.' : 'Rejection reason is mandatory for audit trail integrity.'}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سبب الرفض *' : 'Rejection Reason *'}
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              placeholder={isAr ? 'مثال: وجود فائض مخزني بديل في مستودع 2 أو تجاوز الميزانية' : 'e.g. Existing alternative stock in warehouse or budget limit'}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={handleRejectRequisition}>
              {isAr ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
