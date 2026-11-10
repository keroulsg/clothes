import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { User, Phone, Mail, FileText, MapPin, DollarSign, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import type { Customer } from '../../types';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  customerToEdit?: Customer | null;
  isAr?: boolean;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit = null,
  isAr = true,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [classification, setClassification] = useState<'company' | 'individual' | 'wholesale' | 'retail'>('company');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [commercialRegistry, setCommercialRegistry] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setCode(customerToEdit.code || '');
        setName(customerToEdit.name || '');
        setClassification(customerToEdit.classification || 'company');
        setCompanyName(customerToEdit.company_name || '');
        setContactPerson(customerToEdit.contact_person || '');
        setPhone(customerToEdit.phone || '');
        setEmail(customerToEdit.email || '');
        setTaxId(customerToEdit.tax_id || '');
        setCommercialRegistry(customerToEdit.commercial_registry || '');
        setAddress(customerToEdit.address || '');
        setDeliveryAddress(customerToEdit.delivery_address || '');
        setPaymentTerms(customerToEdit.payment_terms || '');
        setCreditLimit(Number(customerToEdit.credit_limit || 50000));
        setNotes(customerToEdit.notes || '');
      } else {
        setCode('');
        setName('');
        setClassification('company');
        setCompanyName('');
        setContactPerson('');
        setPhone('');
        setEmail('');
        setTaxId('');
        setCommercialRegistry('');
        setAddress('');
        setDeliveryAddress('');
        setPaymentTerms('');
        setCreditLimit(50000);
        setNotes('');
      }
      setErrorMsg('');
    }
  }, [isOpen, customerToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!customerToEdit && !code.trim())) {
      setErrorMsg(isAr ? 'يرجى إدخال كود واسم العميل' : 'Customer code and name are required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (customerToEdit) {
        const res = await api.customers.updateCustomer(customerToEdit.id, {
          name: name.trim(),
          classification,
          company_name: companyName.trim() || undefined,
          contact_person: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          tax_id: taxId.trim() || undefined,
          commercial_registry: commercialRegistry.trim() || undefined,
          address: address.trim() || undefined,
          delivery_address: deliveryAddress.trim() || undefined,
          payment_terms: paymentTerms.trim() || undefined,
          credit_limit: creditLimit ? Number(creditLimit) : undefined,
          notes: notes.trim() || undefined,
        });
        if (res.customer) {
          onSuccess(res.customer);
          onClose();
        }
      } else {
        const res = await api.customers.createCustomer({
          code: code.trim(),
          name: name.trim(),
          classification,
          company_name: companyName.trim() || undefined,
          contact_person: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          tax_id: taxId.trim() || undefined,
          commercial_registry: commercialRegistry.trim() || undefined,
          address: address.trim() || undefined,
          delivery_address: deliveryAddress.trim() || undefined,
          payment_terms: paymentTerms.trim() || undefined,
          notes: notes.trim() || undefined,
          credit_limit: creditLimit ? Number(creditLimit) : undefined,
        });

        if (res.customer) {
          onSuccess(res.customer);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر حفظ العميل على الخادم' : 'Failed to save customer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        customerToEdit
          ? (isAr ? `تعديل بيانات العميل (${customerToEdit.code})` : `Edit Customer (${customerToEdit.code})`)
          : (isAr ? 'تسجيل عميل تجاري / جملة جديد' : 'Register New Wholesale / Commercial Client')
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Customer Classification: Wholesale vs Retail */}
        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700 dark:text-slate-300 text-xs">
            {isAr ? 'تصنيف ونوع العميل *' : 'Customer Category *'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setClassification('company')}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all text-start cursor-pointer ${
                classification === 'company' || classification === 'wholesale'
                  ? 'bg-[#7F1625]/10 border-[#7F1625] text-[#7F1625] dark:text-[#ff8ba0] shadow-sm ring-1 ring-[#7F1625]/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="w-8 h-8 rounded-xl bg-[#7F1625]/15 text-[#7F1625] flex items-center justify-center text-sm font-black shrink-0">
                🏢
              </span>
              <div>
                <p className="font-bold">{isAr ? 'عميل جملة وتوزيع' : 'Wholesale / Corporate'}</p>
                <p className="text-[10px] font-normal text-slate-500">{isAr ? 'محلات، وكلاء، براندات تجارية' : 'Bulk stores & dealers'}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setClassification('individual')}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all text-start cursor-pointer ${
                classification === 'individual' || classification === 'retail'
                  ? 'bg-[#7F1625]/10 border-[#7F1625] text-[#7F1625] dark:text-[#ff8ba0] shadow-sm ring-1 ring-[#7F1625]/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center text-sm font-black shrink-0">
                🛍️
              </span>
              <div>
                <p className="font-bold">{isAr ? 'عميل قطاعي وتجزئة' : 'Retail / Individual'}</p>
                <p className="text-[10px] font-normal text-slate-500">{isAr ? 'مستهلك مباشر، منافذ البيع' : 'Direct consumer & cash'}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'كود العميل التعريفي *' : 'Customer Code *'}
            </label>
            <input
              type="text"
              required
              disabled={!!customerToEdit}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CUST-CAIRO-01"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم العميل / الشركة التجارية *' : 'Client / Store Name *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? 'محلات أطفال المستقبل - العتبة' : 'Future Kids Stores'}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المسؤول / جهة الاتصال' : 'Contact Person'}
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute top-2.5 start-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder={isAr ? 'أ. مصطفى الشناوي' : 'Contact Name'}
                className="w-full ps-8 pe-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'}
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute top-2.5 start-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+201000000000"
                className="w-full ps-8 pe-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute top-2.5 start-2.5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@store.com"
                className="w-full ps-8 pe-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'السجل التجاري / البطاقة الضريبية' : 'Tax ID / Commercial Reg'}
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 absolute top-2.5 start-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="123-456-789"
                className="w-full ps-8 pe-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الحد الائتماني (ج.م)' : 'Credit Limit (EGP)'}
            </label>
            <div className="relative">
              <DollarSign className="w-3.5 h-3.5 absolute top-2.5 start-2.5 text-slate-400 pointer-events-none" />
              <input
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="w-full ps-8 pe-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العنوان / المدينة والمحافظة' : 'Address / City'}
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute top-2.5 start-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isAr ? 'القاهرة - العتبة - شارع الجيش' : 'Cairo, Attaba'}
                className="w-full ps-8 pe-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
            {isAr ? 'ملاحظات وشروط البيع الخاصة' : 'Notes & Commercial Terms'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'شروط السداد، خصومات الكمية، أو متطلبات التعبئة والتسليم...' : 'Payment terms, volume discounts, packaging...'}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting
              ? (isAr ? 'جاري الحفظ...' : 'Saving...')
              : customerToEdit
              ? (isAr ? 'حفظ التعديلات' : 'Save Changes')
              : (isAr ? 'تسجيل العميل' : 'Register Client')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

