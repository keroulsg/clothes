import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ExternalOperation, JobOrder } from '../../types';
import { api } from '../../api/client';
import { AlertTriangle, UserCheck } from 'lucide-react';

interface ExternalOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobOrders: JobOrder[];
  existingOperation?: ExternalOperation | null;
  employees?: any[];
  onSuccess: (op: ExternalOperation) => void;
  isAr?: boolean;
}

export const ExternalOperationModal: React.FC<ExternalOperationModalProps> = ({
  isOpen,
  onClose,
  jobOrders,
  existingOperation,
  employees: propEmployees = [],
  onSuccess,
  isAr = true,
}) => {
  const isReceiving = !!existingOperation;

  const [employeesList, setEmployeesList] = useState<any[]>(propEmployees);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>(existingOperation?.assigned_employee_id || '');
  const [workerUnitRate, setWorkerUnitRate] = useState<number>(1.00);

  useEffect(() => {
    if (employeesList.length === 0) {
      api.hr.getEmployees(1)
        .then((res: any) => {
          if (res?.data && Array.isArray(res.data)) {
            setEmployeesList(res.data);
          }
        })
        .catch(() => {});
    }
  }, [employeesList]);

  const [jobOrderId, setJobOrderId] = useState(existingOperation?.job_order_id || jobOrders[0]?.id || '');
  const [subcontractorName, setSubcontractorName] = useState(
    existingOperation?.subcontractor_name || (isAr ? 'مطبعة الأهرام الحديثة' : 'Al-Ahram Modern Printing')
  );
  const [operationType, setOperationType] = useState<ExternalOperation['operation_type']>(existingOperation?.operation_type || 'embroidery');
  const [sentQuantity, setSentQuantity] = useState<number>(existingOperation?.sent_quantity || 100);
  const [unitRate, setUnitRate] = useState<number>(existingOperation?.unit_rate || 3.5);
  const [notes, setNotes] = useState(existingOperation?.notes || '');

  // Receiving state
  const [acceptedQty, setAcceptedQty] = useState<number>(existingOperation?.received_accepted_quantity || existingOperation?.sent_quantity || 0);
  const [rejectedQty, setRejectedQty] = useState<number>(existingOperation?.received_rejected_quantity || 0);
  const [scrapQty, setScrapQty] = useState<number>(existingOperation?.scrap_quantity || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isReceiving) {
      const sum = Number(acceptedQty) + Number(rejectedQty) + Number(scrapQty);
      if (sum > (existingOperation?.sent_quantity || 0)) {
        setError(
          isAr
            ? `مجموع الكميات المستلمة (${sum}) لا يمكن أن يتجاوز الكمية المرسلة أصلاً (${existingOperation?.sent_quantity})`
            : `Total received quantities (${sum}) cannot exceed sent quantity (${existingOperation?.sent_quantity})`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isReceiving && existingOperation) {
        const payload = {
          received_accepted_quantity: Number(acceptedQty),
          received_rejected_quantity: Number(rejectedQty),
          scrap_quantity: Number(scrapQty),
          assigned_employee_id: assignedEmployeeId || undefined,
          worker_unit_rate: Number(workerUnitRate),
        };
        const res = await api.subcontracting.receiveExternalOp(existingOperation.id, payload);
        const updated = res.data;
        const formatted: ExternalOperation = {
          ...existingOperation,
          assigned_employee_id: assignedEmployeeId || existingOperation.assigned_employee_id,
          received_accepted_quantity: Number(updated.received_accepted_quantity ?? acceptedQty),
          received_rejected_quantity: Number(updated.received_rejected_quantity ?? rejectedQty),
          scrap_quantity: Number(updated.scrap_quantity ?? scrapQty),
          status: updated.status || ((Number(acceptedQty) + Number(rejectedQty) + Number(scrapQty)) >= existingOperation.sent_quantity ? 'completed' : 'partially_returned'),
          returned_at: updated.returned_at || new Date().toISOString(),
        };
        onSuccess(formatted);
        onClose();
      } else {
        const payload = {
          job_order_id: jobOrderId && jobOrderId.length > 20 && !jobOrderId.startsWith('job-') ? jobOrderId : undefined,
          subcontractor_name: subcontractorName,
          operation_type: operationType,
          assigned_employee_id: assignedEmployeeId || undefined,
          sent_quantity: Number(sentQuantity),
          unit_rate: Number(unitRate),
          notes: notes || undefined,
        };
        const res = await api.subcontracting.dispatchExternalOp(payload);
        const created = res.data;
        const formatted: ExternalOperation = {
          id: created.id,
          operation_number: created.operation_number || ('EXT-' + Date.now().toString().slice(-6)),
          job_order_id: created.job_order_id || jobOrderId,
          subcontractor_name: created.subcontractor_name || subcontractorName,
          operation_type: created.operation_type || operationType,
          assigned_employee_id: created.assigned_employee_id || assignedEmployeeId,
          sent_quantity: Number(created.sent_quantity ?? sentQuantity),
          received_accepted_quantity: Number(created.received_accepted_quantity ?? 0),
          received_rejected_quantity: Number(created.received_rejected_quantity ?? 0),
          scrap_quantity: Number(created.scrap_quantity ?? 0),
          unit_rate: Number(created.unit_rate ?? unitRate),
          total_cost: Number(created.total_cost ?? (Number(sentQuantity) * Number(unitRate))),
          status: created.status || 'dispatched',
          dispatched_at: created.dispatched_at || new Date().toISOString(),
          notes: created.notes,
        };
        onSuccess(formatted);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || (isAr ? 'حدث خطأ أثناء معالجة عملية التشغيل الخارجي' : 'An error occurred while processing the external operation'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isReceiving
          ? (isAr ? 'استلام وفحص مخرجات التشغيل الخارجي' : 'Receive & Inspect Outsourced Operation')
          : (isAr ? 'إرسال تشغيل خارجي لمقاول باطن (Outsourced Operation)' : 'Dispatch Outsourced Operation')
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isReceiving ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'أمر التشغيل المرتبط' : 'Associated Job Order'}
                </label>
                <select
                  value={jobOrderId}
                  onChange={(e) => setJobOrderId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {jobOrders.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.order_number} ({j.customer_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم المقاول / الورشة الخارجية' : 'Subcontractor / Workshop Name'}
                </label>
                <input
                  type="text"
                  required
                  value={subcontractorName}
                  onChange={(e) => setSubcontractorName(e.target.value)}
                  placeholder={isAr ? 'مثال: ورشة الفيروز للتطريز والطباعة' : 'e.g. Al-Fayrouz Embroidery'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'نوع العملية' : 'Operation Type'}
                </label>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="embroidery">{isAr ? 'تطريز آلي (Embroidery)' : 'Machine Embroidery'}</option>
                  <option value="printing">{isAr ? 'طباعة سلك سكرين / ترانسفير (Printing)' : 'Screen / Transfer Printing'}</option>
                  <option value="washing">{isAr ? 'غسيل ومعالجة أنزيمات (Washing)' : 'Washing & Enzyme Treatment'}</option>
                  <option value="finishing">{isAr ? 'تشطيب وتغليف خارجي (Finishing)' : 'External Finishing & Packaging'}</option>
                  <option value="overlocking">{isAr ? 'أوفر وتثبيت أكمام (Overlocking)' : 'Overlocking / Assembly'}</option>
                  <option value="other">{isAr ? 'عملية مخصصة أخرى' : 'Other Custom Operation'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'الكمية المرسلة (قطعة)' : 'Sent Quantity (pcs)'}
                </label>
                <input
                  type="number"
                  required
                  value={sentQuantity}
                  onChange={(e) => setSentQuantity(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'سعر القطعة للمقاول (ج.م)' : 'Vendor Rate / Piece (EGP)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={unitRate}
                  onChange={(e) => setUnitRate(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-600 dark:text-slate-400">{isAr ? 'العملية: ' : 'Operation: '}</span>
                <strong className="text-slate-900 dark:text-slate-100">{existingOperation?.operation_type}</strong>
                <span className="text-slate-600 dark:text-slate-400 mx-2">{isAr ? '• المقاول: ' : '• Vendor: '}</span>
                <strong className="text-slate-900 dark:text-slate-100">{existingOperation?.subcontractor_name}</strong>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">{isAr ? 'الكمية المرسلة: ' : 'Sent Qty: '}</span>
                <strong className="text-primary dark:text-[#fca5a5] font-mono text-sm">{existingOperation?.sent_quantity}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'الكمية المقبولة (السليمة)' : 'Accepted Quantity'}
                </label>
                <input
                  type="number"
                  required
                  value={acceptedQty}
                  onChange={(e) => setAcceptedQty(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'الكمية المرفوضة (Rework)' : 'Rejected (Rework)'}
                </label>
                <input
                  type="number"
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'كمية التالف / الهالك النهائي' : 'Scrap / Waste'}
                </label>
                <input
                  type="number"
                  value={scrapQty}
                  onChange={(e) => setScrapQty(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Assigned Worker / Inspector */}
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{isAr ? 'الفني المستلم وفاحص الجودة (ربط بالعمال وأجر القطعة)' : 'Receiving Technician & QC Inspector (HR Link)'}</span>
              </label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="">{isAr ? '-- اختياري: إسناد لفني فحص --' : '-- Optional: Select Technician --'}</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code || emp.id.slice(0, 5)} - {emp.name} ({emp.job_title || emp.department})
                  </option>
                ))}
              </select>

              {assignedEmployeeId && (
                <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-800/40 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {isAr ? 'سعر فحص واستلام القطعة:' : 'Rate per inspected piece:'}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={workerUnitRate}
                        onChange={(e) => setWorkerUnitRate(parseFloat(e.target.value) || 0)}
                        className="w-16 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold text-indigo-600 dark:text-indigo-400"
                      />
                      <span className="text-[10px] text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                    <span>{isAr ? 'الأجر المستحق للفني:' : 'Estimated tech wage:'}</span>
                    <span className="font-bold">
                      {acceptedQty} {isAr ? 'قطعة' : 'pcs'} × {workerUnitRate.toFixed(2)} = {(acceptedQty * workerUnitRate).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'ملاحظات التشغيل الخارجي' : 'External Operation Notes'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'تعليمات أو أسباب العيوب إن وجدت...' : 'Instructions or defect causes if any...'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isReceiving
              ? (isAr ? 'تأكيد استلام وفحص المخرجات' : 'Confirm Receipt & Inspection')
              : (isAr ? 'تأكيد إرسال التشغيل الخارجي' : 'Confirm Dispatch')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
