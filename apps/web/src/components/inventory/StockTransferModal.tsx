import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ArrowRightLeft, Plus, Send, CheckCircle2, Printer, GitBranch, Truck, FileText, Building2 } from 'lucide-react';
import { api } from '../../api/client';
import type { Warehouse, InventoryItem, Branch } from '../../types';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  branches?: Branch[];
  items?: InventoryItem[];
  inventoryItems?: InventoryItem[];
  initialSourceWarehouseId?: string;
  onTransferCompleted?: () => void;
  onSuccess?: () => void;
  isAr?: boolean;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  branches,
  items,
  inventoryItems,
  initialSourceWarehouseId,
  onTransferCompleted,
  onSuccess,
  isAr = true,
}) => {
  const effectiveItems = items || inventoryItems || [];
  const [transfers, setTransfers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<any | null>(null);

  // Create Form State
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || '');
  const [destWarehouseId, setDestWarehouseId] = useState(warehouses[1]?.id || '');
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');

  // Source Warehouse Items Filtered by available stock
  const sourceItems = useMemo(() => {
    return effectiveItems.filter((it) => it.warehouse_id === sourceWarehouseId && it.current_balance > 0);
  }, [effectiveItems, sourceWarehouseId]);

  const [transferLines, setTransferLines] = useState<Array<{ inventory_item_id: string; quantity: number }>>([
    { inventory_item_id: '', quantity: 0 },
  ]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // When source warehouse changes, auto-select first available item
  useEffect(() => {
    if (sourceItems.length > 0) {
      setTransferLines([{ inventory_item_id: sourceItems[0].id, quantity: 0 }]);
    } else {
      setTransferLines([{ inventory_item_id: '', quantity: 0 }]);
    }
  }, [sourceWarehouseId]);

  const notifyComplete = () => {
    if (onTransferCompleted) onTransferCompleted();
    if (onSuccess) onSuccess();
  };

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const res = await api.inventory.getTransfers();
      setTransfers(res.transfers || res.data || []);
    } catch (err: any) {
      console.error('Error fetching transfers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTransfers();
      if (initialSourceWarehouseId) {
        setSourceWarehouseId(initialSourceWarehouseId);
        setIsCreating(true);
      } else {
        setIsCreating(false);
      }
      setErrorMsg('');
      setDriverName('');
      setVehiclePlate('');
      setNotes('');
      if (sourceItems.length > 0) {
        setTransferLines([{ inventory_item_id: sourceItems[0].id, quantity: 0 }]);
      }
    }
  }, [isOpen, initialSourceWarehouseId]);

  const handleAddLine = () => {
    setTransferLines((prev) => [...prev, { inventory_item_id: sourceItems[0]?.id || '', quantity: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    setTransferLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    setTransferLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, [field]: val } : line))
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceWarehouseId === destWarehouseId) {
      setErrorMsg(isAr ? 'لا يمكن التحويل إلى نفس المستودع، يرجى اختيار مستودعين مختلفين' : 'Source and destination warehouses must be different');
      return;
    }

    const validLines = transferLines.filter((l) => l.inventory_item_id && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setErrorMsg(isAr ? 'يرجى تحديد صنف واحد على الأقل مع إدخال كمية أكبر من صفر' : 'Specify at least one item with quantity > 0');
      return;
    }

    // Validation against available stock in source warehouse
    for (const line of validLines) {
      const matched = sourceItems.find((it) => it.id === line.inventory_item_id);
      if (matched && Number(line.quantity) > Number(matched.current_balance)) {
        setErrorMsg(
          isAr
            ? `الكمية المطلوبة (${line.quantity}) للصنف "${matched.name}" تتجاوز الرصيد المتاح (${matched.current_balance} ${matched.unit_of_measure})`
            : `Quantity exceeds available balance for ${matched.name}`
        );
        return;
      }
    }

    setIsSaving(true);
    setErrorMsg('');

    const formattedNotes = [
      notes.trim() || null,
      driverName.trim() ? `${isAr ? 'مسؤول النقل / السائق:' : 'Driver:'} ${driverName.trim()}` : null,
      vehiclePlate.trim() ? `${isAr ? 'رقم اللوحة / المركبة:' : 'Vehicle:'} ${vehiclePlate.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' — ');

    try {
      await api.inventory.createTransfer({
        source_warehouse_id: sourceWarehouseId,
        destination_warehouse_id: destWarehouseId,
        notes: formattedNotes || undefined,
        items: validLines,
      });

      await fetchTransfers();
      setIsCreating(false);
      setNotes('');
      setDriverName('');
      setVehiclePlate('');
      notifyComplete();
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل إنشاء طلب التحويل' : 'Failed to create transfer'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDispatch = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من شحن البضاعة وخصمها من المستودع المصدر؟' : 'Confirm dispatch from source warehouse?')) {
      return;
    }
    try {
      await api.inventory.dispatchTransfer(id);
      await fetchTransfers();
      notifyComplete();
    } catch (err: any) {
      alert(err.message || 'Error dispatching transfer');
    }
  };

  const handleReceive = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من استلام البضاعة وإضافتها لرصيد المستودع الهدف؟' : 'Confirm receiving into destination warehouse?')) {
      return;
    }
    try {
      await api.inventory.receiveTransfer(id);
      await fetchTransfers();
      notifyComplete();
    } catch (err: any) {
      alert(err.message || 'Error receiving transfer');
    }
  };

  const statusBadges: Record<string, { label: string; variant: 'neutral' | 'warning' | 'success' | 'danger' }> = {
    draft: { label: isAr ? 'مسودة جاهزة' : 'Draft', variant: 'neutral' },
    dispatched: { label: isAr ? 'في طريق النقل (مشحون)' : 'In Transit', variant: 'warning' },
    received: { label: isAr ? 'تم الاستلام' : 'Received', variant: 'success' },
    cancelled: { label: isAr ? 'ملغى' : 'Cancelled', variant: 'danger' },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'تحويلات المخازن والشحنات الداخلية (Stock Transfers & In-Transit)' : 'Stock Transfers'}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Printable Transfer Voucher (Modal Overlay) */}
        {selectedTransferForPrint && (
          <div className="printable-sheet p-6 md:p-8 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl shadow-xl space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none">
            {/* Action Bar (Hidden in Print) */}
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <span className="font-bold text-sm text-slate-800 dark:text-white">
                  {isAr ? 'معاينة إذن التحويل والطباعة' : 'Transfer Voucher Preview'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => window.print()} variant="primary" size="sm" className="shadow-xs font-bold">
                  <Printer className="w-4 h-4 mr-1.5" />
                  {isAr ? 'طباعة إذن الشحن والتحويل' : 'Print Voucher'}
                </Button>
                <Button onClick={() => setSelectedTransferForPrint(null)} variant="outline" size="sm">
                  {isAr ? 'إغلاق المعاينة' : 'Close Preview'}
                </Button>
              </div>
            </div>

            {/* Formal Document Header */}
            <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">GarmentOS ERP — Supply Chain Management</div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {isAr ? 'إذن صرف ونقل مخزني داخلي (بوليصة شحن)' : 'Internal Stock Transfer Voucher & Waybill'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'سند رسمي ملزم لنقل وتداول الخامات والمنتجات بين المستودعات والفروع' : 'Official warehouse transfer and delivery voucher'}
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono">
                  <div className="text-xs text-slate-500">{isAr ? 'رقم الإذن:' : 'Transfer #:'}</div>
                  <div className="text-lg font-black text-primary-700 dark:text-primary-400">
                    {selectedTransferForPrint.transfer_number}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(selectedTransferForPrint.created_at).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Source & Destination Comparative Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800 pb-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>{isAr ? 'الجهة المصدرة (جهة الصرف والخصم)' : 'Origin (Dispatched From)'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'المستودع المصدر:' : 'Warehouse:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedTransferForPrint.source_warehouse?.name || '—'}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">({selectedTransferForPrint.source_warehouse?.code})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'الفرع / الموقع:' : 'Branch:'}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedTransferForPrint.source_warehouse?.branch?.name || (isAr ? 'الفرع الرئيسي' : 'Main Branch')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'أمين المستودع القائم بالصرف:' : 'Issued By:'}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedTransferForPrint.creator?.name || (isAr ? 'أمين المستودع المصرح له' : 'Authorized Storekeeper')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800 pb-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'الجهة الهدف (جهة الاستلام والإضافة)' : 'Destination (Received To)'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'المستودع الهدف:' : 'Warehouse:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedTransferForPrint.destination_warehouse?.name || '—'}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">({selectedTransferForPrint.destination_warehouse?.code})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'الفرع / الموقع:' : 'Branch:'}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedTransferForPrint.destination_warehouse?.branch?.name || (isAr ? 'الفرع المستلم' : 'Destination Branch')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'أمين المستودع المستلم:' : 'Received By:'}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedTransferForPrint.receiver?.name || (selectedTransferForPrint.status === 'received' ? (isAr ? 'أمين المستودع المستلم' : 'Receiver Storekeeper') : (isAr ? 'قيد انتظار الاستلام' : 'Pending Receipt'))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transport & Notes Box */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">{isAr ? 'بيانات الشحن / الملاحظات:' : 'Logistics / Notes:'}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedTransferForPrint.notes || (isAr ? 'تحويل مخزني داخلي قياسي' : 'Standard Internal Transfer')}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'حالة الشحنة:' : 'Status:'}</span>
                  <Badge variant={statusBadges[selectedTransferForPrint.status]?.variant || 'neutral'}>
                    {statusBadges[selectedTransferForPrint.status]?.label || selectedTransferForPrint.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isAr ? 'تاريخ وساعة الإصدار:' : 'Timestamp:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(selectedTransferForPrint.created_at).toLocaleString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>

            {/* Transfer Items Table */}
            <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">{isAr ? 'كود الصنف' : 'Item Code'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'اسم الصنف والمواصفات الفنية' : 'Item Description'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الكمية المحولة' : 'Transferred Qty'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'وحدة القياس' : 'UOM'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'حالة المطابقة عند الاستلام' : 'Receipt Check'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(selectedTransferForPrint.items || []).map((it: any, i: number) => (
                    <tr key={it.id || i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center font-mono">{i + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {it.inventory_item?.code || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {it.inventory_item?.name || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-center text-sm text-primary-700 dark:text-primary-300">
                        {Number(it.quantity).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-600 dark:text-slate-400">
                        {it.inventory_item?.unit_of_measure || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        [  ] {isAr ? 'سليم ومطابق' : 'Verified'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4 Official Signature Blocks & Stamp */}
            <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700 mt-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
                <div className="p-3 border rounded-xl bg-slate-50/40 dark:bg-slate-800/30">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{isAr ? 'أمين المستودع المصدر' : 'Issuing Storekeeper'}</div>
                  <div className="text-[10px] text-slate-500 mb-6">{isAr ? '(تم الصرف والخصم)' : '(Dispatched)'}</div>
                  <div className="border-b border-dotted border-slate-400 w-28 mx-auto mb-1"></div>
                  <div className="text-[10px] text-slate-400 font-mono">{isAr ? 'التوقيع والاسم' : 'Sign & Name'}</div>
                </div>

                <div className="p-3 border rounded-xl bg-slate-50/40 dark:bg-slate-800/30">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{isAr ? 'مسؤول النقل / السائق' : 'Driver / Carrier'}</div>
                  <div className="text-[10px] text-slate-500 mb-6">{isAr ? '(تم استلام العهدة للشحن)' : '(Carried)'}</div>
                  <div className="border-b border-dotted border-slate-400 w-28 mx-auto mb-1"></div>
                  <div className="text-[10px] text-slate-400 font-mono">{isAr ? 'التوقيع ورقم البطاقة' : 'Sign & ID'}</div>
                </div>

                <div className="p-3 border rounded-xl bg-slate-50/40 dark:bg-slate-800/30">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{isAr ? 'أمين المستودع المستلم' : 'Receiving Storekeeper'}</div>
                  <div className="text-[10px] text-slate-500 mb-6">{isAr ? '(تم الفحص والإضافة للرصيد)' : '(Received)'}</div>
                  <div className="border-b border-dotted border-slate-400 w-28 mx-auto mb-1"></div>
                  <div className="text-[10px] text-slate-400 font-mono">{isAr ? 'التوقيع والاسم' : 'Sign & Name'}</div>
                </div>

                <div className="p-3 border rounded-xl bg-slate-50/40 dark:bg-slate-800/30 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{isAr ? 'اعتماد إدارة المستودعات' : 'Warehouse Authority'}</div>
                    <div className="text-[10px] text-slate-500">{isAr ? 'خاتم المصنع الرسمي' : 'Official Stamp'}</div>
                  </div>
                  <div className="w-16 h-16 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-full mx-auto my-1 flex items-center justify-center text-[9px] text-slate-400">
                    {isAr ? 'موضع الختم' : 'Stamp'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        {!selectedTransferForPrint && (
          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500">
              {isAr ? 'إجمالي طلبات التحويل:' : 'Total Transfers:'} <span className="font-bold text-slate-800 dark:text-white">{transfers.length}</span>
            </div>
            {!isCreating && (
              <Button
                onClick={() => setIsCreating(true)}
                variant="primary"
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'طلب تحويل مخزني جديد' : 'New Transfer'}</span>
              </Button>
            )}
          </div>
        )}

        {/* Create Transfer Form */}
        {isCreating && !selectedTransferForPrint && (
          <Card className="p-4 border-2 border-primary-500/30 bg-primary-50/10 dark:bg-primary-950/20">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary-600" />
              <span>{isAr ? 'إنشاء أمر تحويل مخزني بين المستودعات' : 'Create Stock Transfer'}</span>
            </h4>

            {errorMsg && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'المستودع المصدر (خصم البضاعة) *' : 'Source Warehouse *'}
                  </label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                    required
                  >
                    {branches && branches.length > 0 ? (
                      branches.map((b) => {
                        const bWarehouses = warehouses.filter((w) => w.branch_id === b.id);
                        if (bWarehouses.length === 0) return null;
                        return (
                          <optgroup key={b.id} label={`🏢 فرع: ${b.name} (${b.code})`}>
                            {bWarehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name} ({w.code})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    ) : null}
                    {/* Unassigned warehouses */}
                    {warehouses.filter((w) => !w.branch_id || !branches?.some((b) => b.id === w.branch_id)).length > 0 && (
                      <optgroup label={branches && branches.length > 0 ? (isAr ? 'مستودعات عامة' : 'General Warehouses') : ''}>
                        {warehouses
                          .filter((w) => !w.branch_id || !branches?.some((b) => b.id === w.branch_id))
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.code})
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'المستودع الهدف (إضافة البضاعة) *' : 'Destination Warehouse *'}
                  </label>
                  <select
                    value={destWarehouseId}
                    onChange={(e) => setDestWarehouseId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                    required
                  >
                    {branches && branches.length > 0 ? (
                      branches.map((b) => {
                        const bWarehouses = warehouses.filter((w) => w.branch_id === b.id);
                        if (bWarehouses.length === 0) return null;
                        return (
                          <optgroup key={b.id} label={`🏢 فرع: ${b.name} (${b.code})`}>
                            {bWarehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name} ({w.code})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    ) : null}
                    {/* Unassigned warehouses */}
                    {warehouses.filter((w) => !w.branch_id || !branches?.some((b) => b.id === w.branch_id)).length > 0 && (
                      <optgroup label={branches && branches.length > 0 ? (isAr ? 'مستودعات عامة' : 'General Warehouses') : ''}>
                        {warehouses
                          .filter((w) => !w.branch_id || !branches?.some((b) => b.id === w.branch_id))
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.code})
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {/* Items Lines */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? 'بنود الأصناف والكميات المراد تحويلها من المستودع المصدر:' : 'Transfer Items & Quantities:'}
                  </label>
                  <Button type="button" onClick={handleAddLine} variant="outline" size="sm" className="text-xs py-1" disabled={sourceItems.length === 0}>
                    + {isAr ? 'إضافة صنف آخر' : 'Add Item'}
                  </Button>
                </div>

                {sourceItems.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-lg">
                    ⚠️ {isAr ? 'المستودع المصدر المختار لا يحتوي حالياً على أي أصناف برصيد متاح موجب (> 0).' : 'Selected source warehouse has no available stock.'}
                  </div>
                ) : (
                  transferLines.map((line, idx) => {
                    const selectedItem = sourceItems.find((it) => it.id === line.inventory_item_id);
                    const isExceeding = selectedItem && Number(line.quantity) > Number(selectedItem.current_balance);

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <select
                            value={line.inventory_item_id}
                            onChange={(e) => handleLineChange(idx, 'inventory_item_id', e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                            required
                          >
                            <option value="">{isAr ? 'اختر الصنف المراد تحويله...' : 'Select Item...'}</option>
                            {sourceItems.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name} ({it.code}) — {isAr ? 'المتاح في المستودع:' : 'Avail:'} {it.current_balance} {it.unit_of_measure}
                              </option>
                            ))}
                          </select>

                          <div className="relative">
                            <input
                              type="number"
                              step="0.0001"
                              min="0.0001"
                              max={selectedItem ? selectedItem.current_balance : undefined}
                              placeholder={isAr ? 'الكمية' : 'Qty'}
                              value={line.quantity || ''}
                              onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className={`w-32 px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border rounded-lg ${
                                isExceeding ? 'border-red-500 ring-1 ring-red-500' : ''
                              }`}
                              required
                            />
                            {selectedItem && (
                              <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-medium">
                                {selectedItem.unit_of_measure}
                              </span>
                            )}
                          </div>

                          {transferLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-red-500 hover:text-red-700 p-1 text-xs"
                              title={isAr ? 'حذف البند' : 'Remove Line'}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {isExceeding && (
                          <div className="text-[11px] text-red-600 font-medium">
                            ⚠️ {isAr ? `الكمية تتجاوز الرصيد المتاح (${selectedItem.current_balance} ${selectedItem.unit_of_measure})` : 'Exceeds available balance'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Logistics & Driver Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'اسم السائق / مسؤول النقل' : 'Driver / Carrier Name'}
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder={isAr ? 'مثال: محمد أحمد (سائق النقل)' : 'Driver name...'}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'رقم اللوحة / شاحنة النقل' : 'Vehicle / Plate #'}
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder={isAr ? 'مثال: أ ب ج 1234' : 'Plate number...'}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'ملاحظات والغرض من أمر التحويل' : 'Transfer Notes & Purpose'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: تغذية صالة الخياطة لأمر إنتاج رقم 105' : 'Transfer purpose...'}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSaving || sourceItems.length === 0}>
                  {isSaving ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ وإصدار أمر التحويل' : 'Create Transfer')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Transfers List */}
        {!selectedTransferForPrint && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">{isAr ? 'رقم التحويل' : 'Transfer #'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'من مستودع' : 'From Warehouse'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'إلى مستودع' : 'To Warehouse'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'عدد البنود' : 'Items'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'القائم بالتحويل' : 'Initiated By'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="py-2.5 px-3 text-center">{isAr ? 'إجراءات دورة العمل' : 'Workflow Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      {isAr ? 'جارِ تحميل التحويلات...' : 'Loading transfers...'}
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      {isAr ? 'لا توجد طلبات تحويل مسجلة' : 'No transfers recorded'}
                    </td>
                  </tr>
                ) : (
                  transfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {tr.transfer_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        <div>{tr.source_warehouse?.name || '—'}</div>
                        {tr.source_warehouse?.branch && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mt-0.5">
                            <GitBranch className="w-2.5 h-2.5" />
                            <span>{tr.source_warehouse.branch.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        <div>{tr.destination_warehouse?.name || '—'}</div>
                        {tr.destination_warehouse?.branch && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                            <GitBranch className="w-2.5 h-2.5" />
                            <span>{tr.destination_warehouse.branch.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="neutral">
                          {tr.items_count || (tr.items ? tr.items.length : 1)} {isAr ? 'صنف' : 'items'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {tr.creator?.name || (isAr ? 'أمين المستودع' : 'Storekeeper')}
                        </div>
                        {tr.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]" title={tr.notes}>
                            {tr.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={statusBadges[tr.status]?.variant || 'neutral'}>
                          {statusBadges[tr.status]?.label || tr.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(tr.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            onClick={() => setSelectedTransferForPrint(tr)}
                            variant="outline"
                            size="sm"
                            className="text-[11px] py-1 px-2"
                            title={isAr ? 'عرض وطباعة إذن التحويل' : 'Print Transfer Voucher'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>

                          {tr.status === 'draft' && (
                            <Button
                              onClick={() => handleDispatch(tr.id)}
                              variant="primary"
                              size="sm"
                              className="text-[11px] py-1 px-2.5 flex items-center gap-1 bg-amber-600 hover:bg-amber-700"
                            >
                              <Send className="w-3 h-3" />
                              <span>{isAr ? 'شحن البضاعة' : 'Dispatch'}</span>
                            </Button>
                          )}

                          {tr.status === 'dispatched' && (
                            <Button
                              onClick={() => handleReceive(tr.id)}
                              variant="primary"
                              size="sm"
                              className="text-[11px] py-1 px-2.5 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isAr ? 'تأكيد الاستلام' : 'Receive'}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
