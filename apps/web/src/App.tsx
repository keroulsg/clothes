import { useState } from 'react';
import {
  Scissors,
  TrendingUp,
  Package,
  Layers,
  AlertTriangle,
  Plus,
  CheckCircle,
  Sparkles,
  Calculator,
  ArrowRightLeft,
  Search,
  Filter,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { AppLayout } from './components/layout/AppLayout';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { LoadingSkeleton } from './components/ui/LoadingSkeleton';
import { EmptyState } from './components/ui/EmptyState';
import { ErrorState } from './components/ui/ErrorState';
import { FabricCalculatorModal } from './components/inventory/FabricCalculatorModal';
import { StockTransactionModal } from './components/inventory/StockTransactionModal';
import { CreateModelModal } from './components/catalog/CreateModelModal';
import { CreatePurchaseOrderModal } from './components/procurement/CreatePurchaseOrderModal';
import { ReceiveGoodsModal } from './components/procurement/ReceiveGoodsModal';
import { SupplierInvoiceModal } from './components/procurement/SupplierInvoiceModal';
import { CreateSupplierModal } from './components/procurement/CreateSupplierModal';
import { CreateProductionOrderModal } from './components/production/CreateProductionOrderModal';
import { CuttingOrderModal } from './components/production/CuttingOrderModal';
import { BundleTrackerModal } from './components/production/BundleTrackerModal';
import { QualityInspectionModal } from './components/production/QualityInspectionModal';
import type {
  Language,
  ProductionOrder,
  InventoryItem,
  Branch,
  GarmentModel,
  InventoryTransaction,
  CustomerMaterial,
  Supplier,
  PurchaseOrder,
  GoodsReceiptNote,
  SupplierInvoice,
  Warehouse,
  CuttingOrder,
  CuttingBundle,
  QualityInspection,
} from './types';

export function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Multi-Tenancy Current State
  const [tenantName, setTenantName] = useState<string>('مصنع النيل لملابس الأطفال');
  const [tenantCode, setTenantCode] = useState<string>('MFG-EG901');
  const [branchName, setBranchName] = useState<string>('المصنع وصالة القص الرئيسية');

  // Modals state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isFabricCalcOpen, setIsFabricCalcOpen] = useState(false);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);

  // Procurement States
  const [isCreatePoModalOpen, setIsCreatePoModalOpen] = useState(false);
  const [isCreateSupplierModalOpen, setIsCreateSupplierModalOpen] = useState(false);
  const [selectedPoForReceipt, setSelectedPoForReceipt] = useState<PurchaseOrder | null>(null);
  const [selectedPoForInvoice, setSelectedPoForInvoice] = useState<PurchaseOrder | null>(null);

  // Production & Cutting States
  const [isCreateProdOrderModalOpen, setIsCreateProdOrderModalOpen] = useState(false);
  const [selectedProdOrderForCut, setSelectedProdOrderForCut] = useState<ProductionOrder | null>(null);
  const [selectedBundleForTracker, setSelectedBundleForTracker] = useState<CuttingBundle | null>(null);
  const [selectedProdOrderForQc, setSelectedProdOrderForQc] = useState<ProductionOrder | null>(null);

  const [warehouses] = useState<Warehouse[]>([
    {
      id: 'wh-1',
      name: 'مخزن الأقمشة الرئيسي',
      code: 'WH-FAB-01',
      type: 'fabric',
      allow_negative_stock: false,
      items_count: 14,
    },
    {
      id: 'wh-2',
      name: 'مخزن أمانات خامات العملاء',
      code: 'WH-CUST-01',
      type: 'customer_deposits',
      allow_negative_stock: false,
      items_count: 5,
    },
    {
      id: 'wh-3',
      name: 'مخزن المستلزمات والإكسسوارات',
      code: 'WH-ACC-01',
      type: 'accessories',
      allow_negative_stock: false,
      items_count: 28,
    },
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: 'sup-1',
      code: 'SUP-TEX-01',
      name: 'شركة مصر للغزل والنسيج (المحلة)',
      contact_person: 'م. أحمد شكري',
      phone: '+201002345678',
      tax_id: '100-244-901',
      payment_terms: 'net_30',
      current_balance: 114000.0,
    },
    {
      id: 'sup-2',
      code: 'SUP-ACC-02',
      name: 'الشركة السويسرية للمستلزمات والسوست',
      contact_person: 'أ. طارق عبد العليم',
      phone: '+201223456789',
      tax_id: '200-456-789',
      payment_terms: 'net_15',
      current_balance: 18500.0,
    },
  ]);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: 'po-201',
      po_number: 'PO-202610-091',
      supplier_id: 'sup-1',
      supplier_name: 'شركة مصر للغزل والنسيج (المحلة)',
      warehouse_id: 'wh-1',
      warehouse_name: 'مخزن الأقمشة الرئيسي',
      order_date: '2026-10-10',
      expected_delivery_date: '2026-10-20',
      status: 'approved',
      subtotal: 100000.0,
      tax_amount: 14000.0,
      total_amount: 114000.0,
      items: [
        {
          id: 'poi-1',
          inventory_item_id: 'mat-1',
          item_name: 'قماش سينجل جيرسي قطن 100% كحلي (180 GSM)',
          item_code: 'FAB-COT-BLU',
          ordered_quantity: 1000,
          received_quantity: 0,
          remaining_quantity: 1000,
          unit_price: 100.0,
          total_price: 114000.0,
        },
      ],
    },
    {
      id: 'po-202',
      po_number: 'PO-202610-092',
      supplier_id: 'sup-2',
      supplier_name: 'الشركة السويسرية للمستلزمات',
      warehouse_id: 'wh-3',
      warehouse_name: 'مخزن المستلزمات',
      order_date: '2026-10-12',
      status: 'draft',
      subtotal: 12500.0,
      tax_amount: 1750.0,
      total_amount: 14250.0,
      items: [
        {
          id: 'poi-2',
          inventory_item_id: 'mat-3',
          item_name: 'أزرار كبس بلاستيك بيضاء',
          item_code: 'ACC-SNP-WHT',
          ordered_quantity: 50000,
          received_quantity: 0,
          remaining_quantity: 50000,
          unit_price: 0.25,
          total_price: 14250.0,
        },
      ],
    },
  ]);

  const [goodsReceiptNotes, setGoodsReceiptNotes] = useState<GoodsReceiptNote[]>([
    {
      id: 'grn-1',
      grn_number: 'GRN-202610-001',
      po_number: 'PO-202610-088',
      supplier_name: 'شركة مصر للغزل والنسيج',
      warehouse_name: 'مخزن الأقمشة الرئيسي',
      receipt_date: '2026-10-12',
      quality_inspector_name: 'م. طارق كمال',
      inspection_status: 'passed',
      accepted_quantity: 500,
      rejected_quantity: 0,
    },
  ]);

  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([
    {
      id: 'sinv-1',
      invoice_number: 'INV-MISR-9941',
      internal_reference: 'SINV-202610-044',
      supplier_name: 'شركة مصر للغزل والنسيج',
      po_number: 'PO-202610-088',
      invoice_date: '2026-10-12',
      due_date: '2026-11-12',
      subtotal: 50000.0,
      tax_amount: 7000.0,
      total_amount: 57000.0,
      matching_status: 'matched',
      payment_status: 'unpaid',
    },
  ]);

  // New Company Form state
  const [newCompanyForm, setNewCompanyForm] = useState({
    companyName: '',
    subdomain: '',
    ownerName: '',
    email: '',
    plan: 'professional',
  });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [companySuccessMsg, setCompanySuccessMsg] = useState('');

  // UI state toggles
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isEmptyDemo, setIsEmptyDemo] = useState(false);
  const [isErrorDemo, setIsErrorDemo] = useState(false);

  // Search & Filter state
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');

  // Garment Models State
  const [models, setModels] = useState<GarmentModel[]>([
    {
      id: 'gm-1',
      code: 'MOD-KID-081',
      name: 'طقم أطفال صيفي (تيشيرت بولو + شورت جبردين)',
      category: 'طقم أولادي قطن',
      season: 'صيف 2026',
      target_cost: 95.0,
      wholesale_price: 155.0,
      retail_price: 220.0,
      variants_count: 12,
      status: 'active',
      created_at: '2026-10-10',
    },
    {
      id: 'gm-2',
      code: 'MOD-INF-019',
      name: 'سالوبيت مواليد قطن 100% مطبوع ديجيتال',
      category: 'سالوبيت مواليد',
      season: 'صيف 2026',
      target_cost: 65.0,
      wholesale_price: 110.0,
      retail_price: 165.0,
      variants_count: 8,
      status: 'active',
      created_at: '2026-10-12',
    },
    {
      id: 'gm-3',
      code: 'MOD-GRL-044',
      name: 'فستان بناتي تول ناعم مع بطانة قطن',
      category: 'فستان بناتي تول',
      season: 'أعياد 2026',
      target_cost: 130.0,
      wholesale_price: 210.0,
      retail_price: 295.0,
      variants_count: 6,
      status: 'active',
      created_at: '2026-10-14',
    },
  ]);

  // Production Orders State
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([
    {
      id: 'po-101',
      order_number: 'PO-2026-081',
      model_name: 'طقم أطفال صيفي (تيشيرت بولو + شورت جبردين)',
      model_code: 'MOD-KID-081',
      category: 'أولادي (2-4 سنوات)',
      target_quantity: 1200,
      planned_quantity: 1200,
      cut_quantity: 1200,
      completed_quantity: 810,
      sewn_quantity: 840,
      qc_passed_quantity: 810,
      waste_percentage: 2.8,
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-10-25',
      target_delivery_date: '2026-10-25',
      items: [
        { id: '1', color_name: 'كحلي غامق', size_name: '2Y', planned_quantity: 600, cut_quantity: 600, completed_quantity: 405, color_id: 'c1', size_id: 's1' },
        { id: '2', color_name: 'أحمر زاهي', size_name: '4Y', planned_quantity: 600, cut_quantity: 600, completed_quantity: 405, color_id: 'c2', size_id: 's2' },
      ],
    },
    {
      id: 'po-102',
      order_number: 'PO-2026-082',
      model_name: 'سالوبيت مواليد قطن 100% مطبوع',
      model_code: 'MOD-INF-019',
      category: 'حديثي ولادة (3-6 شهور)',
      target_quantity: 2000,
      planned_quantity: 2000,
      cut_quantity: 2000,
      completed_quantity: 1920,
      sewn_quantity: 1950,
      qc_passed_quantity: 1920,
      waste_percentage: 1.9,
      status: 'in_progress',
      priority: 'urgent',
      due_date: '2026-10-20',
      target_delivery_date: '2026-10-20',
      items: [
        { id: '3', color_name: 'أبيض لؤلؤي', size_name: '0-3M', planned_quantity: 1000, cut_quantity: 1000, completed_quantity: 960, color_id: 'c3', size_id: 's3' },
        { id: '4', color_name: 'سماوي ناعم', size_name: '3-6M', planned_quantity: 1000, cut_quantity: 1000, completed_quantity: 960, color_id: 'c4', size_id: 's4' },
      ],
    },
    {
      id: 'po-103',
      order_number: 'PO-2026-083',
      model_name: 'فستان بناتي تول ناعم مع بطانة قطن',
      model_code: 'MOD-GRL-044',
      category: 'بناتي (4-6 سنوات)',
      target_quantity: 800,
      planned_quantity: 800,
      cut_quantity: 0,
      completed_quantity: 0,
      waste_percentage: 0,
      status: 'approved',
      priority: 'normal',
      due_date: '2026-11-01',
      target_delivery_date: '2026-11-01',
      items: [
        { id: '5', color_name: 'وردي زهور', size_name: '4-6Y', planned_quantity: 800, cut_quantity: 0, completed_quantity: 0, color_id: 'c5', size_id: 's5' },
      ],
    },
  ]);

  const [cuttingOrders, setCuttingOrders] = useState<CuttingOrder[]>([
    {
      id: 'cut-1',
      cutting_order_number: 'CUT-202610-081',
      production_order_id: 'po-101',
      production_order_number: 'PO-2026-081',
      model_name: 'طقم أطفال صيفي (تيشيرت بولو + شورت جبردين)',
      table_number: 'طاولة القص 1',
      fabric_name: 'قماش سنجل جيرسي قطن 100% كحلي',
      fabric_source: 'factory_owned',
      warehouse_name: 'مخزن الأقمشة الرئيسي',
      lay_length_meters: 2.2,
      layers_count: 50,
      marker_efficiency_percent: 88.4,
      actual_fabric_meters_used: 112.5,
      theoretical_fabric_meters: 110.0,
      end_loss_meters: 0.05,
      total_cut_pieces: 1200,
      status: 'cut_completed',
      created_at: '2026-10-12',
    },
  ]);

  const [cuttingBundles, setCuttingBundles] = useState<CuttingBundle[]>([
    {
      id: 'bnd-101',
      bundle_code: 'BND-202610-0012',
      cutting_order_id: 'cut-1',
      production_order_id: 'po-101',
      bundle_number: 12,
      color_name: 'كحلي غامق',
      size_name: '2Y (سنتين)',
      quantity: 25,
      current_stage_code: 'sewing',
      status: 'active',
    },
    {
      id: 'bnd-102',
      bundle_code: 'BND-202610-0013',
      cutting_order_id: 'cut-1',
      production_order_id: 'po-101',
      bundle_number: 13,
      color_name: 'أحمر زاهي',
      size_name: '4Y (4 سنوات)',
      quantity: 25,
      current_stage_code: 'finishing',
      status: 'active',
    },
    {
      id: 'bnd-103',
      bundle_code: 'BND-202610-0014',
      cutting_order_id: 'cut-1',
      production_order_id: 'po-101',
      bundle_number: 14,
      color_name: 'أبيض لؤلؤي',
      size_name: '2Y (سنتين)',
      quantity: 25,
      current_stage_code: 'assembly',
      status: 'held_for_qc',
    },
  ]);

  const [qualityInspections, setQualityInspections] = useState<QualityInspection[]>([
    {
      id: 'qc-1',
      inspection_number: 'QC-202610-081',
      production_order_id: 'po-101',
      production_order_number: 'PO-2026-081',
      bundle_code: 'BND-202610-0012',
      inspector_name: 'م. نادية سمير (مديرة الجودة)',
      inspection_type: 'final_audit',
      inspected_quantity: 100,
      passed_quantity: 98,
      rework_quantity: 2,
      rejected_quantity: 0,
      decision: 'rework_required',
      defects: [
        { defect_type: 'skip_stitch', severity: 'minor', quantity: 2, corrective_action: 'إعادة خياطة الحلية والياقة' },
      ],
      created_at: '2026-10-13',
    },
  ]);

  // Inventory Items State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    {
      id: 'mat-1',
      warehouse_id: 'wh-1',
      warehouse_name: 'مخزن الأقمشة المركزي',
      item_type: 'fabric_raw',
      code: 'FAB-COT-BLU',
      name: 'قماش سينجل جيرسي قطن 100% كحلي (180 GSM - عرض 1.6م)',
      unit_of_measure: 'متر',
      current_balance: 1450.5,
      average_cost: 110.0,
      reorder_level: 500,
      is_customer_owned: false,
      technical_specs: { gsm: 180, usable_width_meters: 1.6 },
    },
    {
      id: 'mat-2',
      warehouse_id: 'wh-2',
      warehouse_name: 'مخزن أمانات خامات العملاء',
      item_type: 'fabric_raw',
      code: 'FAB-CUST-GAB-01',
      name: 'قماش جبردين ليكرا بيج (خامات العميل: أزياء الصغار)',
      unit_of_measure: 'متر',
      current_balance: 820.0,
      average_cost: 0.0,
      reorder_level: 0,
      is_customer_owned: true,
      customer_name: 'شركة أزياء الصغار (قص للغير)',
      technical_specs: { gsm: 240, usable_width_meters: 1.5 },
    },
    {
      id: 'mat-3',
      warehouse_id: 'wh-3',
      warehouse_name: 'مخزن المستلزمات',
      item_type: 'accessory_raw',
      code: 'ACC-SNP-WHT',
      name: 'أزرار كبس بلاستيك بيضاء خاصة بملابس الأطفال',
      unit_of_measure: 'قطعة',
      current_balance: 18500,
      average_cost: 0.25,
      reorder_level: 5000,
      is_customer_owned: false,
    },
    {
      id: 'mat-4',
      warehouse_id: 'wh-3',
      warehouse_name: 'مخزن المستلزمات',
      item_type: 'accessory_raw',
      code: 'ACC-THRD-NVY',
      name: 'خيط حياكة بوليستر عالي الشد 40/2 كحلي',
      unit_of_measure: 'بكرة',
      current_balance: 140,
      average_cost: 32.5,
      reorder_level: 50,
      is_customer_owned: false,
    },
  ]);

  // Stock Ledger Log State
  const [stockLedger, setStockLedger] = useState<InventoryTransaction[]>([
    {
      id: 'tx-1',
      item_code: 'FAB-COT-BLU',
      item_name: 'قماش سينجل جيرسي قطن 100% كحلي',
      warehouse_name: 'مخزن الأقمشة المركزي',
      transaction_type: 'goods_receipt',
      direction: 'IN',
      quantity: 500,
      unit_cost: 110.0,
      total_cost: 55000,
      balance_before: 950.5,
      balance_after: 1450.5,
      reference_type: 'purchase_order',
      reference_number: 'PO-2026-044',
      created_at: '2026-10-14 14:30',
    },
    {
      id: 'tx-2',
      item_code: 'ACC-SNP-WHT',
      item_name: 'أزرار كبس بلاستيك بيضاء',
      warehouse_name: 'مخزن المستلزمات',
      transaction_type: 'material_issuance',
      direction: 'OUT',
      quantity: 2400,
      unit_cost: 0.25,
      total_cost: 600,
      balance_before: 20900,
      balance_after: 18500,
      reference_type: 'cutting_order',
      reference_number: 'CUT-ORD-081',
      created_at: '2026-10-14 11:15',
    },
  ]);

  // Customer Materials State
  const [customerMaterials] = useState<CustomerMaterial[]>([
    {
      id: 'cm-1',
      customer_name: 'شركة أزياء الصغار',
      fabric_name: 'قماش جبردين ليكرا بيج تركي',
      fabric_code: 'CUST-GAB-01',
      gsm: 240,
      usable_width_meters: 1.5,
      received_meters: 1200,
      consumed_meters: 350,
      waste_meters: 30,
      remaining_meters: 820,
      warehouse_name: 'مخزن أمانات خامات العملاء',
    },
  ]);

  // Branches list
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: 'b-1',
      tenant_id: 't-1',
      name: 'المصنع وصالة القص الرئيسية',
      code: 'HQ-01',
      type: 'factory',
      is_main: true,
      address: 'المنطقة الصناعية، العاشر من رمضان',
      phone: '+201002345678',
    },
    {
      id: 'b-2',
      tenant_id: 't-1',
      name: 'مخزن الأقمشة والمستلزمات المركزي',
      code: 'WH-FAB-01',
      type: 'warehouse',
      is_main: false,
      address: 'مجمع المخازن، العبور',
    },
    {
      id: 'b-3',
      tenant_id: 't-1',
      name: 'منفذ بيع وتوزيع العتبة (جملة)',
      code: 'POS-ATB',
      type: 'outlet',
      is_main: false,
      address: 'شارع الجيش، القاهرة',
    },
  ]);

  const handleRegisterCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCompany(true);
    setTimeout(() => {
      setIsSubmittingCompany(false);
      setTenantName(newCompanyForm.companyName || 'شركة الأندلس للأزياء');
      const generatedCode = 'MFG-' + Math.floor(1000 + Math.random() * 9000);
      setTenantCode(generatedCode);
      setCompanySuccessMsg('تم تسجيل الشركة بنجاح وعزل قاعدة بياناتها وسياقها!');
      setTimeout(() => {
        setIsCompanyModalOpen(false);
        setCompanySuccessMsg('');
      }, 1500);
    }, 900);
  };

  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchType, setNewBranchType] = useState<'factory' | 'outlet' | 'warehouse'>('warehouse');

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchCode) return;
    const created: Branch = {
      id: 'b-' + (branches.length + 1),
      tenant_id: 'current',
      name: newBranchName,
      code: newBranchCode,
      type: newBranchType,
      is_main: false,
    };
    setBranches([...branches, created]);
    setBranchName(created.name);
    setIsBranchModalOpen(false);
    setNewBranchName('');
    setNewBranchCode('');
  };

  const handleStockTransactionSuccess = (updatedBalance: number) => {
    if (!selectedStockItem) return;
    const diff = updatedBalance - selectedStockItem.current_balance;
    const direction = diff >= 0 ? 'IN' : 'OUT';
    const quantity = Math.abs(diff);

    // Update item in state
    setInventoryItems(prev =>
      prev.map(it => it.id === selectedStockItem.id ? { ...it, current_balance: updatedBalance } : it)
    );

    // Prepend to ledger
    const newTx: InventoryTransaction = {
      id: 'tx-' + Date.now(),
      item_code: selectedStockItem.code,
      item_name: selectedStockItem.name,
      warehouse_name: selectedStockItem.warehouse_name,
      transaction_type: direction === 'IN' ? 'goods_receipt' : 'material_issuance',
      direction,
      quantity,
      unit_cost: selectedStockItem.average_cost,
      total_cost: quantity * selectedStockItem.average_cost,
      balance_before: selectedStockItem.current_balance,
      balance_after: updatedBalance,
      reference_type: direction === 'IN' ? 'goods_receipt' : 'cutting_order',
      reference_number: 'TX-' + Math.floor(1000 + Math.random() * 9000),
      created_at: new Date().toLocaleTimeString(),
    };
    setStockLedger([newTx, ...stockLedger]);
  };

  const handleModelCreated = (newModel: GarmentModel) => {
    setModels([newModel, ...models]);
  };

  // Filtered inventory
  const filteredInventory = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                          item.code.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCategory = inventoryCategoryFilter === 'all' ||
                            (inventoryCategoryFilter === 'customer' && item.is_customer_owned) ||
                            (inventoryCategoryFilter === 'company' && !item.is_customer_owned) ||
                            (item.item_type === inventoryCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lang={lang}
      onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      tenantName={tenantName}
      tenantCode={tenantCode}
      branchName={branchName}
      onOpenNewCompanyModal={() => setIsCompanyModalOpen(true)}
    >
      {/* State Simulator Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 font-medium">
            {lang === 'ar' ? 'التحكم في محاكاة الحالات البرمجية للتأكد من المعايير:' : 'State Simulator Controls:'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isLoadingDemo ? 'primary' : 'outline'}
            onClick={() => {
              setIsLoadingDemo(!isLoadingDemo);
              setIsEmptyDemo(false);
              setIsErrorDemo(false);
            }}
          >
            {isLoadingDemo ? 'إلغاء التحميل' : 'حالة التحميل (Loading)'}
          </Button>
          <Button
            size="sm"
            variant={isEmptyDemo ? 'primary' : 'outline'}
            onClick={() => {
              setIsEmptyDemo(!isEmptyDemo);
              setIsLoadingDemo(false);
              setIsErrorDemo(false);
            }}
          >
            {isEmptyDemo ? 'إلغاء الفارغ' : 'حالة بدون بيانات (Empty)'}
          </Button>
          <Button
            size="sm"
            variant={isErrorDemo ? 'danger' : 'outline'}
            onClick={() => {
              setIsErrorDemo(!isErrorDemo);
              setIsLoadingDemo(false);
              setIsEmptyDemo(false);
            }}
          >
            {isErrorDemo ? 'إلغاء الخطأ' : 'حالة الخطأ (Error)'}
          </Button>
        </div>
      </div>

      {isLoadingDemo ? (
        <Card>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">جارِ مزامنة بيانات المصنع وقاعدة البيانات...</h3>
            <LoadingSkeleton count={6} />
          </div>
        </Card>
      ) : isErrorDemo ? (
        <ErrorState
          title="فشل الاتصال بخادم قاعدة البيانات"
          message="تعذر جلب سجلات صالة القص بسبب انتهاء مهلة الاتصال بالخادم. يرجى إعادة المحاولة."
          onRetry={() => setIsErrorDemo(false)}
        />
      ) : isEmptyDemo ? (
        <EmptyState
          title="لا توجد بيانات مسجلة حاليًا"
          description="لم يقم المصنع بإصدار أي أوامر أو حركات مخزنية لهذا الشهر حتى الآن."
          actionText="إصدار حركة جديدة"
          onAction={() => setIsEmptyDemo(false)}
        />
      ) : (
        <>
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Top KPI Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card hover>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">مبيعات اليوم المحققة</span>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 font-mono">
                    84,500 <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <span>+14.2%</span>
                    <span className="text-slate-400">عن مبيعات أمس</span>
                  </div>
                </Card>

                <Card hover>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">أوامر الإنتاج النشطة</span>
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Scissors className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 font-mono">
                    {productionOrders.length} <span className="text-xs font-normal text-slate-400">أوامر جارية</span>
                  </div>
                  <div className="mt-2 text-[11px] text-indigo-400 font-medium">
                    4,000 قطعة قيد التصنيع
                  </div>
                </Card>

                <Card hover>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">رصيد الأقمشة بالمخازن</span>
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 font-mono">
                    2,270.5 <span className="text-xs font-normal text-slate-400">متر</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    منها <span className="text-amber-400 font-medium">820 م أمانات عملاء</span>
                  </div>
                </Card>

                <Card hover>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">نسبة الهالك الفعلي (قص)</span>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    2.6% <span className="text-xs font-normal text-slate-400">(ممتاز)</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    أقل من المعياري المسموح (3.5%)
                  </div>
                </Card>

                <Card hover>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">أجور القطعة المستحقة</span>
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 font-mono">
                    16,840 <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </div>
                  <div className="mt-2 text-[11px] text-purple-400">
                    مربوطة بمطابقة الجودة
                  </div>
                </Card>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" onClick={() => setIsCreateModelOpen(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                  تعريف موديل جديد وتوليد المتغيرات
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFabricCalcOpen(true)}
                  icon={<Calculator className="w-3.5 h-3.5 text-indigo-400" />}
                >
                  حاسبة الأقمشة (متر ↔ كجم بـ GSM والعرض)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedStockItem(inventoryItems[0]);
                  }}
                  icon={<ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />}
                >
                  تسجيل حركة مخزنية سريعة
                </Button>
              </div>

              {/* Live Cutting Room Tracker preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">أوامر الإنتاج وصالة القص المباشرة</h3>
                    <p className="text-xs text-slate-400">تقدم مراحل القص والخياطة والجودة لكل أمر تشغيل</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab('cutting')}>
                    عرض صالة القص كاملة
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {productionOrders.map((order) => {
                    const sewPercent = Math.round(((order.sewn_quantity || 0) / order.target_quantity) * 100);
                    return (
                      <Card key={order.id} hover className="border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-indigo-400">{order.order_number}</span>
                          <Badge variant={order.status === 'sewing' ? 'info' : 'warning'} dot>
                            {order.status === 'sewing' ? 'خياطة' : 'جودة'}
                          </Badge>
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 line-clamp-1 mb-2">{order.model_name}</h4>
                        <div className="text-[11px] text-slate-400 mb-1 flex justify-between">
                          <span>الإنجاز:</span>
                          <span className="font-mono text-slate-200">{order.sewn_quantity} / {order.target_quantity} ({sewPercent}%)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${sewPercent}%` }} />
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span>الهالك: <strong className="text-emerald-400 font-mono">{order.waste_percentage}%</strong></span>
                          <span>التسليم: <strong className="text-slate-300 font-mono">{order.due_date}</strong></span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GARMENT MODELS CATALOG */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">كتالوج موديلات الملابس وملفات التشغيل</h3>
                  <p className="text-xs text-slate-400">إدارة الموديلات والمقاسات والألوان وتوليد الباركود الدولي والـ SKU</p>
                </div>
                <Button size="sm" onClick={() => setIsCreateModelOpen(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                  موديل جديد + مصفوفة المتغيرات
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models.map((m) => (
                  <Card key={m.id} hover className="border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                        {m.code}
                      </span>
                      <Badge variant="success">نشط</Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{m.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{m.category}</span>
                        <span>•</span>
                        <span>{m.season}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">التكلفة</span>
                        <strong className="font-mono text-slate-200">{m.target_cost} ج.م</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">الجملة</span>
                        <strong className="font-mono text-indigo-400">{m.wholesale_price} ج.م</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">التجزئة</span>
                        <strong className="font-mono text-emerald-400">{m.retail_price} ج.م</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        المتغيرات: <strong className="text-slate-200 font-mono">{m.variants_count} مقاس ولون</strong>
                      </span>
                      <Button variant="ghost" size="sm" className="text-xs h-7">
                        بطاقة الباركود والـ BOM
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY & STOCK LEDGER */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">إدارة المخازن ودفتر الأستاذ غير القابل للتعديل</h3>
                  <p className="text-xs text-slate-400">مخازن الأقمشة والمستلزمات وفصل أمانات خامات العملاء للقص للغير</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsFabricCalcOpen(true)}
                    icon={<Calculator className="w-3.5 h-3.5 text-indigo-400" />}
                  >
                    حاسبة الأقمشة (متر ↔ كجم)
                  </Button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 max-w-sm w-full relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="بحث باسم الخامة، الكود، أو العميل..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs py-2 pr-9 pl-3 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={inventoryCategoryFilter}
                    onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg text-xs py-1.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">كل الأصناف والخامات</option>
                    <option value="company">خامات المصنع المملوكة فقط</option>
                    <option value="customer">أمانات خامات العملاء فقط</option>
                    <option value="fabric_raw">الأقمشة</option>
                    <option value="accessory_raw">المستلزمات والإكسسوارات</option>
                  </select>
                </div>
              </div>

              {/* Inventory Items Table */}
              <Card className="overflow-hidden p-0 border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="py-3 px-4">كود الصنف</th>
                        <th className="py-3 px-4">اسم الخامة والمواصفات</th>
                        <th className="py-3 px-4">الملكية والنوع</th>
                        <th className="py-3 px-4">المخزن الحالي</th>
                        <th className="py-3 px-4">الرصيد الدفتري</th>
                        <th className="py-3 px-4">متوسط التكلفة</th>
                        <th className="py-3 px-4">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-indigo-400">{item.code}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{item.name}</div>
                            {item.technical_specs?.gsm && (
                              <div className="text-[10px] text-slate-400">
                                GSM: {item.technical_specs.gsm} جم/م² • عرض: {item.technical_specs.usable_width_meters} م
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.is_customer_owned ? (
                              <Badge variant="warning">أمانات: {item.customer_name}</Badge>
                            ) : (
                              <Badge variant="success">مملوك للمصنع</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">{item.warehouse_name}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-100">
                            {item.current_balance.toLocaleString()} {item.unit_of_measure}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {item.is_customer_owned ? '—' : `${item.average_cost.toFixed(2)} ج.م`}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setSelectedStockItem(item)}
                            >
                              تسجيل حركة
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Customer Supplied Materials Separated Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">أرصدة خامات العملاء (أمانات تشغيل للغير)</h4>
                    <p className="text-xs text-slate-400">خامات لا تسجل كأصول للمصنع ولا تدخل ضمن حسابات تكلفة البضاعة المباعة</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerMaterials.map((cm) => (
                    <Card key={cm.id} className="border-amber-500/20 bg-amber-500/5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400">{cm.customer_name}</span>
                        <span className="font-mono text-[11px] text-slate-400">{cm.fabric_code}</span>
                      </div>
                      <h5 className="text-xs font-semibold text-slate-200">{cm.fabric_name}</h5>
                      <div className="text-[11px] text-slate-400">
                        كثافة النسيج: <strong className="text-slate-300 font-mono">{cm.gsm} GSM</strong> • العرض الصالح: <strong className="text-slate-300 font-mono">{cm.usable_width_meters} م</strong>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-[10px]">
                        <div>
                          <span className="text-slate-400 block">المستلم</span>
                          <strong className="font-mono text-slate-200">{cm.received_meters} م</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">المستهلك</span>
                          <strong className="font-mono text-sky-400">{cm.consumed_meters} م</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">الهالك</span>
                          <strong className="font-mono text-rose-400">{cm.waste_meters} م</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">المتبقي</span>
                          <strong className="font-mono text-emerald-400">{cm.remaining_meters} م</strong>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Immutable Stock Ledger (Audit Trail) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">دفتر الأستاذ المخزني (سجل التدقيق غير القابل للتعديل)</h4>
                    <p className="text-xs text-slate-400">كل حركة مخزنية تسجل آلياً وتثبت الرصيد السابق واللاحق والمستند المرجعي</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">الوقت</th>
                          <th className="py-2.5 px-4">الصنف</th>
                          <th className="py-2.5 px-4">نوع الحركة</th>
                          <th className="py-2.5 px-4">الاتجاه</th>
                          <th className="py-2.5 px-4">الكمية</th>
                          <th className="py-2.5 px-4">قبل الحركة</th>
                          <th className="py-2.5 px-4">بعد الحركة</th>
                          <th className="py-2.5 px-4">المستند المرجعي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {stockLedger.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-800/20">
                            <td className="py-2.5 px-4 text-slate-400">{tx.created_at}</td>
                            <td className="py-2.5 px-4 font-sans font-medium text-slate-200">{tx.item_name}</td>
                            <td className="py-2.5 px-4 font-sans text-slate-300">{tx.transaction_type}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant={tx.direction === 'IN' ? 'success' : 'danger'}>
                                {tx.direction}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-100">{tx.quantity.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-slate-400">{tx.balance_before.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-emerald-400 font-bold">{tx.balance_after.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-indigo-400">{tx.reference_number || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: CUTTING & PRODUCTION */}
          {activeTab === 'cutting' && (
            <div className="space-y-6">
              {/* Header with Title and Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-indigo-400" />
                    <span>تشغيل الإنتاج، صالة القص، وتتبع بطاقات الحزم والجودة</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    أوامر التشغيل المعتمدة، خطط الفرش والطبقات، بطاقات الحزم بالباركود، ونقاط التفتيش
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsFabricCalcOpen(true)}
                    icon={<Calculator className="w-3.5 h-3.5 text-indigo-400" />}
                  >
                    حاسبة أطوال وأوزان الفرش
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsCreateProdOrderModalOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    إصدار أمر إنتاج جديد
                  </Button>
                </div>
              </div>

              {/* KPI Performance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card hover>
                  <div className="text-xs text-slate-400 mb-1">إجمالي أوامر الإنتاج</div>
                  <div className="text-xl font-bold font-mono text-slate-100">
                    {productionOrders.length} <span className="text-xs font-normal text-slate-400">أوامر</span>
                  </div>
                  <div className="text-[11px] text-indigo-400 mt-1 font-medium">
                    {productionOrders.filter(p => p.status === 'in_progress').length} قيد التشغيل في الورشة
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-400 mb-1">القطع المقصوصة بصالة القص</div>
                  <div className="text-xl font-bold font-mono text-sky-400">
                    {productionOrders.reduce((sum, p) => sum + p.cut_quantity, 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">قطعة</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    عبر {cuttingOrders.length} أوامر فرش وقص
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-400 mb-1">حزم التشغيل النشطة بالباركود</div>
                  <div className="text-xl font-bold font-mono text-purple-400">
                    {cuttingBundles.length} <span className="text-xs font-normal text-slate-400">حزمة (Bundle)</span>
                  </div>
                  <div className="text-[11px] text-purple-400 mt-1 font-medium">
                    موزعة على الخياطة والتجهيز والتشطيب
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-400 mb-1">المنتج التام المجاز والمرحل للمخزن</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {productionOrders.reduce((sum, p) => sum + (p.completed_quantity || p.qc_passed_quantity || 0), 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">قطعة</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                    اجتازت الفحص النهائي بنجاح
                  </div>
                </Card>
              </div>

              {/* Section 1: Production Orders Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">أوامر الإنتاج وتفصيل المقاسات والألوان</h4>
                    <p className="text-xs text-slate-400">متابعة الكميات المخططة والمقصوصة والمنجزة ومواعيد التسليم</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="py-3 px-4">رقم الأمر</th>
                          <th className="py-3 px-4">الموديل والنوع</th>
                          <th className="py-3 px-4">المخطط</th>
                          <th className="py-3 px-4">المقصوص</th>
                          <th className="py-3 px-4">المنجز التام</th>
                          <th className="py-3 px-4">موعد التسليم</th>
                          <th className="py-3 px-4">الأولوية</th>
                          <th className="py-3 px-4">الحالة</th>
                          <th className="py-3 px-4">الإجراءات والعمليات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {productionOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-400">{order.order_number}</td>
                            <td className="py-3 px-4 font-medium text-slate-200">
                              <div>{order.model_name}</div>
                              <span className="text-[10px] text-slate-400 font-mono">[{order.model_code}]</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-100">
                              {(order.planned_quantity || order.target_quantity).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-sky-400 font-semibold">
                              {order.cut_quantity.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                              {(order.completed_quantity || order.qc_passed_quantity || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">{order.target_delivery_date || order.due_date}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  order.priority === 'urgent'
                                    ? 'danger'
                                    : order.priority === 'high'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {order.priority === 'urgent' ? 'عاجل جداً' : order.priority === 'high' ? 'مرتفع' : 'عادي'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  order.status === 'completed'
                                    ? 'success'
                                    : order.status === 'in_progress' || order.status === 'sewing'
                                    ? 'info'
                                    : order.status === 'approved' || order.status === 'cutting'
                                    ? 'purple'
                                    : 'neutral'
                                }
                                dot={order.status === 'in_progress' || order.status === 'approved'}
                              >
                                {order.status === 'completed'
                                  ? 'مكتمل'
                                  : order.status === 'in_progress' || order.status === 'sewing'
                                  ? 'قيد التشغيل'
                                  : order.status === 'approved'
                                  ? 'معتمد (جاهز للقص)'
                                  : order.status === 'cutting'
                                  ? 'صالة القص'
                                  : 'مسودة'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {order.status === 'draft' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 text-emerald-400 border-emerald-500/30"
                                    onClick={() => {
                                      setProductionOrders((prev) =>
                                        prev.map((o) => (o.id === order.id ? { ...o, status: 'approved' } : o))
                                      );
                                    }}
                                  >
                                    اعتماد الأمر
                                  </Button>
                                )}

                                {(order.status === 'approved' || order.status === 'in_progress' || order.status === 'cutting') && (
                                  <Button
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setSelectedProdOrderForCut(order)}
                                    icon={<Scissors className="w-3 h-3" />}
                                  >
                                    أمر قص وفرش
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 text-emerald-400 hover:text-emerald-300"
                                  onClick={() => setSelectedProdOrderForQc(order)}
                                  icon={<ShieldCheck className="w-3 h-3" />}
                                >
                                  فحص الجودة (QC)
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Section 2: Cutting Room Orders (Lay & Plies) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">أوامر صالة القص وخطط الفرش (Lay & Cut Orders)</h4>
                    <p className="text-xs text-slate-400">طول الفرشة، عدد الراقات، الأمتار المصروفة من المخزن، وعوادم الأطراف</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="py-3 px-4">رقم إذن القص</th>
                          <th className="py-3 px-4">أمر الإنتاج</th>
                          <th className="py-3 px-4">الطاولة</th>
                          <th className="py-3 px-4">الخامة المستخدمة</th>
                          <th className="py-3 px-4">مصدر القماش</th>
                          <th className="py-3 px-4">طول الفرشة</th>
                          <th className="py-3 px-4">الطبقات (الراقات)</th>
                          <th className="py-3 px-4">الأمتار المصروفة</th>
                          <th className="py-3 px-4">القطع الناتجة</th>
                          <th className="py-3 px-4">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {cuttingOrders.map((cut) => (
                          <tr key={cut.id} className="hover:bg-slate-800/20">
                            <td className="py-3 px-4 font-bold text-sky-400">{cut.cutting_order_number}</td>
                            <td className="py-3 px-4 text-indigo-400">{cut.production_order_number}</td>
                            <td className="py-3 px-4 font-sans text-slate-300">{cut.table_number}</td>
                            <td className="py-3 px-4 font-sans font-medium text-slate-200">{cut.fabric_name}</td>
                            <td className="py-3 px-4">
                              <Badge variant={cut.fabric_source === 'factory_owned' ? 'info' : 'warning'}>
                                {cut.fabric_source === 'factory_owned' ? 'خامات المصنع' : 'أمانة عميل CMT'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{cut.lay_length_meters} م</td>
                            <td className="py-3 px-4 font-bold text-slate-100">{cut.layers_count} راقة</td>
                            <td className="py-3 px-4 text-amber-400 font-bold">{cut.actual_fabric_meters_used} م</td>
                            <td className="py-3 px-4 text-emerald-400 font-bold">{cut.total_cut_pieces} قطعة</td>
                            <td className="py-3 px-4">
                              <Badge variant="success">تم القص وتوليد الحزم</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Section 3: Live Bundle Cards Floor Tracker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">بطاقات الحزم وتتبع خطوط الإنتاج (Bundle Cards Floor Tracker)</h4>
                    <p className="text-xs text-slate-400">تتبع مسار الحزم بالباركود بين مراحل القص، التجهيز، الخياطة، والتشطيب</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {cuttingBundles.map((bnd) => (
                    <Card key={bnd.id} hover className="border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-400">
                          <QrCode className="w-4 h-4 text-indigo-400" />
                          <span>{bnd.bundle_code}</span>
                        </div>
                        <Badge variant="neutral">حزمة #{bnd.bundle_number}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">اللون</span>
                          <span className="text-slate-200 font-semibold">{bnd.color_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">المقاس</span>
                          <span className="text-indigo-400 font-bold font-mono">{bnd.size_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">الكمية</span>
                          <span className="text-emerald-400 font-bold font-mono">{bnd.quantity} قطعة</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                        <Badge
                          variant={
                            bnd.current_stage_code === 'completed'
                              ? 'success'
                              : bnd.current_stage_code === 'sewing'
                              ? 'info'
                              : bnd.current_stage_code === 'finishing' || bnd.current_stage_code === 'ironing'
                              ? 'purple'
                              : 'warning'
                          }
                          dot
                        >
                          {bnd.current_stage_code === 'cutting'
                            ? 'صالة القص'
                            : bnd.current_stage_code === 'assembly'
                            ? 'التجهيز والتجميع'
                            : bnd.current_stage_code === 'sewing'
                            ? 'خط الخياطة'
                            : bnd.current_stage_code === 'finishing'
                            ? 'التشطيب'
                            : bnd.current_stage_code === 'ironing'
                            ? 'الكي بالبخار'
                            : bnd.current_stage_code === 'packing'
                            ? 'الفحص والتعبئة'
                            : 'مكتمل'}
                        </Badge>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => setSelectedBundleForTracker(bnd)}
                          icon={<ArrowRightLeft className="w-3 h-3" />}
                        >
                          تسليم ونقل المرحلة
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Section 4: Quality Inspections & Defects Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">سجل فحص وتدقيق الجودة والعيوب (Quality Control Hub)</h4>
                    <p className="text-xs text-slate-400">تقارير الفحص المرحلي، العيوب المسجلة، وإذن الترحيل للمنتج النهائي</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="py-3 px-4">رقم تقرير الفحص</th>
                          <th className="py-3 px-4">أمر الإنتاج</th>
                          <th className="py-3 px-4">مفتش الجودة</th>
                          <th className="py-3 px-4">نوع الفحص</th>
                          <th className="py-3 px-4">المفحوص</th>
                          <th className="py-3 px-4">المقبول السليم</th>
                          <th className="py-3 px-4">إعادة تشغيل (Rework)</th>
                          <th className="py-3 px-4">المرفوض (Scrap)</th>
                          <th className="py-3 px-4">القرار والاعتماد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {qualityInspections.map((qc) => (
                          <tr key={qc.id} className="hover:bg-slate-800/20">
                            <td className="py-3 px-4 font-bold text-emerald-400">{qc.inspection_number}</td>
                            <td className="py-3 px-4 text-indigo-400">{qc.production_order_number}</td>
                            <td className="py-3 px-4 font-sans text-slate-200">{qc.inspector_name}</td>
                            <td className="py-3 px-4 font-sans text-slate-300">
                              {qc.inspection_type === 'final_audit'
                                ? 'فحص نهائي وترحيل للمخزن'
                                : qc.inspection_type === 'inline'
                                ? 'فحص مرحلي بالخط'
                                : 'فحص نهاية الخط'}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-100">{qc.inspected_quantity}</td>
                            <td className="py-3 px-4 text-emerald-400 font-bold">{qc.passed_quantity}</td>
                            <td className="py-3 px-4 text-amber-400 font-bold">{qc.rework_quantity}</td>
                            <td className="py-3 px-4 text-red-400 font-bold">{qc.rejected_quantity}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  qc.decision === 'passed'
                                    ? 'success'
                                    : qc.decision === 'rework_required'
                                    ? 'warning'
                                    : 'danger'
                                }
                              >
                                {qc.decision === 'passed'
                                  ? 'مطابق ومجاز'
                                  : qc.decision === 'rework_required'
                                  ? 'إعادة تشغيل'
                                  : 'مرفوض'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: PROCUREMENT & VENDOR MANAGEMENT */}
          {activeTab === 'purchasing' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    دورة المشتريات والموردين وفحص الاستلام والمطابقة الثلاثية
                  </h3>
                  <p className="text-xs text-slate-400">
                    أوامر الشراء، أذون فحص الجودة والاستلام المخزني (GRN)، ومطابقة فواتير الموردين
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreateSupplierModalOpen(true)}
                  >
                    تسجيل مورد جديد
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsCreatePoModalOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    إصدار أمر شراء جديد
                  </Button>
                </div>
              </div>

              {/* Procurement KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card hover>
                  <div className="text-xs text-slate-400 mb-1">أوامر الشراء النشطة</div>
                  <div className="text-xl font-bold font-mono text-slate-100">
                    {purchaseOrders.length} <span className="text-xs font-normal text-slate-400">أوامر</span>
                  </div>
                  <div className="text-[11px] text-indigo-400 mt-1 font-medium">
                    منها {purchaseOrders.filter(p => p.status === 'approved' || p.status === 'partially_received').length} قيد التوريد
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-400 mb-1">إجمالي التزامات الموردين (المستحقات)</div>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {suppliers.reduce((acc, s) => acc + s.current_balance, 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    أرصدة حسابات الموردين المعتمدة
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-400 mb-1">فواتير المطابقة الثلاثية (3-Way Match)</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {supplierInvoices.length} <span className="text-xs font-normal text-slate-400">فواتير مسجلة</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                    تمت المطابقة مع أذون استلام المخزن
                  </div>
                </Card>
              </div>

              {/* Purchase Orders Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200">أوامر الشراء ومتابعة التوريد</h4>
                <Card className="overflow-hidden p-0 border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="py-3 px-4">رقم الأمر</th>
                          <th className="py-3 px-4">المورد المعتمد</th>
                          <th className="py-3 px-4">المخزن المستهدف</th>
                          <th className="py-3 px-4">تاريخ الأمر</th>
                          <th className="py-3 px-4">الإجمالي (شامل الضريبة)</th>
                          <th className="py-3 px-4">الحالة</th>
                          <th className="py-3 px-4">الإجراءات والعمليات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {purchaseOrders.map((po) => (
                          <tr key={po.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-400">{po.po_number}</td>
                            <td className="py-3 px-4 font-medium text-slate-200">{po.supplier_name}</td>
                            <td className="py-3 px-4 text-slate-400">{po.warehouse_name}</td>
                            <td className="py-3 px-4 font-mono text-slate-300">{po.order_date}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-100">
                              {po.total_amount.toLocaleString()} ج.م
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  po.status === 'received'
                                    ? 'success'
                                    : po.status === 'approved'
                                    ? 'info'
                                    : po.status === 'partially_received'
                                    ? 'warning'
                                    : 'neutral'
                                }
                                dot={po.status === 'approved' || po.status === 'partially_received'}
                              >
                                {po.status === 'received'
                                  ? 'مستلم بالكامل'
                                  : po.status === 'approved'
                                  ? 'معتمد (قيد التوريد)'
                                  : po.status === 'partially_received'
                                  ? 'مستلم جزئيًا'
                                  : 'مسودة'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {po.status === 'draft' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 text-emerald-400 border-emerald-500/30"
                                    onClick={() => {
                                      setPurchaseOrders(prev =>
                                        prev.map(p => p.id === po.id ? { ...p, status: 'approved' } : p)
                                      );
                                    }}
                                  >
                                    اعتماد الأمر
                                  </Button>
                                )}

                                {(po.status === 'approved' || po.status === 'partially_received') && (
                                  <Button
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setSelectedPoForReceipt(po)}
                                  >
                                    فحص واستلام (GRN)
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 text-slate-300 hover:text-indigo-400"
                                  onClick={() => setSelectedPoForInvoice(po)}
                                >
                                  مطابقة الفاتورة
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Goods Receipt Notes Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">أذون فحص واستلام البضاعة (GRN Log)</h4>
                    <p className="text-xs text-slate-400">سجل فحص الجودة والكميات المقبولة والمرفوضة المحولة للمخزن</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">رقم إذن الاستلام</th>
                          <th className="py-2.5 px-4">أمر الشراء</th>
                          <th className="py-2.5 px-4">المورد</th>
                          <th className="py-2.5 px-4">مسؤول فحص الجودة</th>
                          <th className="py-2.5 px-4">نتيجة الفحص</th>
                          <th className="py-2.5 px-4">المقبول (للمخزن)</th>
                          <th className="py-2.5 px-4">المرفوض (تالف)</th>
                          <th className="py-2.5 px-4">ملاحظات الرفض</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {goodsReceiptNotes.map((grn) => (
                          <tr key={grn.id} className="hover:bg-slate-800/20">
                            <td className="py-2.5 px-4 font-bold text-indigo-400">{grn.grn_number}</td>
                            <td className="py-2.5 px-4 text-slate-300">{grn.po_number}</td>
                            <td className="py-2.5 px-4 font-sans text-slate-200">{grn.supplier_name}</td>
                            <td className="py-2.5 px-4 font-sans text-slate-300">{grn.quality_inspector_name}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant={grn.inspection_status === 'passed' ? 'success' : 'warning'}>
                                {grn.inspection_status === 'passed' ? 'مطابق واجتاز الفحص' : 'اجتياز جزئي'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 font-bold text-emerald-400">+{grn.accepted_quantity.toLocaleString()} م</td>
                            <td className="py-2.5 px-4 font-bold text-rose-400">
                              {grn.rejected_quantity > 0 ? `-${grn.rejected_quantity.toLocaleString()} م` : '0'}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-slate-400">
                              {grn.rejection_reason || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* 3-Way Matched Supplier Invoices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">سجل فواتير الموردين والمطابقة الثلاثية</h4>
                    <p className="text-xs text-slate-400">فواتير معتمدة ومطابقة مع أوامر الشراء وأذون استلام المخزن</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">رقم الفاتورة الضريبية</th>
                          <th className="py-2.5 px-4">المرجع الداخلي</th>
                          <th className="py-2.5 px-4">المورد</th>
                          <th className="py-2.5 px-4">أمر الشراء المرجعي</th>
                          <th className="py-2.5 px-4">تاريخ الاستحقاق</th>
                          <th className="py-2.5 px-4">القيمة الإجمالية</th>
                          <th className="py-2.5 px-4">نتيجة المطابقة الثلاثية</th>
                          <th className="py-2.5 px-4">حالة السداد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {supplierInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-800/20">
                            <td className="py-2.5 px-4 font-bold text-slate-100">{inv.invoice_number}</td>
                            <td className="py-2.5 px-4 text-slate-400">{inv.internal_reference}</td>
                            <td className="py-2.5 px-4 font-sans text-slate-200">{inv.supplier_name}</td>
                            <td className="py-2.5 px-4 text-indigo-400">{inv.po_number}</td>
                            <td className="py-2.5 px-4 text-slate-300">{inv.due_date}</td>
                            <td className="py-2.5 px-4 font-bold text-emerald-400">{inv.total_amount.toLocaleString()} ج.م</td>
                            <td className="py-2.5 px-4">
                              <Badge variant={inv.matching_status === 'matched' ? 'success' : 'warning'}>
                                {inv.matching_status === 'matched' ? 'مطابقة تامة 100%' : 'فرق في السعر'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant={inv.payment_status === 'paid' ? 'success' : 'neutral'}>
                                {inv.payment_status === 'paid' ? 'مدفوعة' : 'غير مسددة'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Vendors List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">سجل الموردين المعتمدين</h4>
                    <p className="text-xs text-slate-400">بيانات الاتصال، السجل الضريبي، وشروط الدفع</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suppliers.map((s) => (
                    <Card key={s.id} className="border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100">{s.name}</span>
                        <span className="font-mono text-xs text-indigo-400">{s.code}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>مسؤول الاتصال: <strong className="text-slate-300">{s.contact_person || '—'}</strong></span>
                        <span>الهاتف: <strong className="text-slate-300 font-mono">{s.phone || '—'}</strong></span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                        <span className="text-slate-400">
                          شروط الدفع: <Badge variant="neutral">{s.payment_terms}</Badge>
                        </span>
                        <span>
                          الرصيد المستحق: <strong className="text-amber-400 font-mono">{s.current_balance.toLocaleString()} ج.م</strong>
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fallback for other tabs */}
          {['sales', 'costing', 'piece_rate', 'storefront', 'settings'].includes(activeTab) && (
            <Card className="text-center py-12">
              <div className="p-4 rounded-2xl bg-slate-800/40 text-indigo-400 mx-auto w-fit mb-3">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-1">
                وحدة {activeTab === 'sales' ? 'المبيعات' : activeTab === 'costing' ? 'التكاليف' : activeTab === 'piece_rate' ? 'أجور القطعة' : activeTab === 'storefront' ? 'المتجر الإلكتروني' : 'الإعدادات'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                قاعدة البيانات ودفتر الأستاذ ومحرك العزل جاهزان للربط مع هذه الوحدة في المراحل القادمة.
              </p>
              <Button size="sm" onClick={() => setActiveTab('purchasing')}>
                العودة إلى وحدة المشتريات
              </Button>
            </Card>
          )}
        </>
      )}

      {/* MODAL 1: New Company Registration */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={lang === 'ar' ? 'تسجيل شركة أو مصنع جديد على المنصة' : 'Register New Tenant Company'}
      >
        <form onSubmit={handleRegisterCompany} className="space-y-4">
          {companySuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{companySuccessMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المصنع / الشركة</label>
            <input
              type="text"
              required
              value={newCompanyForm.companyName}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, companyName: e.target.value })}
              placeholder="مثال: مصنع الفيروز لملابس الأطفال"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المالك / المدير المسؤول</label>
            <input
              type="text"
              required
              value={newCompanyForm.ownerName}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, ownerName: e.target.value })}
              placeholder="مثال: م. حسام الدين"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني للشركة</label>
            <input
              type="email"
              required
              value={newCompanyForm.email}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, email: e.target.value })}
              placeholder="hossam@al-fayrouz.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">باقة الاشتراك</label>
            <select
              value={newCompanyForm.plan}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, plan: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="starter">باقة الورش الصغيرة (Starter) — 3 مستخدمين</option>
              <option value="professional">باقة المصانع المتكاملة (Professional) — إنتاج وقص ومخازن</option>
              <option value="enterprise">باقة الشركات الكبرى (Enterprise) — فروع ومخازن غير محدودة</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCompanyModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={isSubmittingCompany}>
              تأكيد وإنشاء حساب المصنع
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Create Branch */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title="إضافة فرع أو مخزن جديد للشركة"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">اسم الفرع</label>
            <input
              type="text"
              required
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="مثال: مخزن صالة القص رقم 2"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">كود الفرع</label>
            <input
              type="text"
              required
              value={newBranchCode}
              onChange={(e) => setNewBranchCode(e.target.value)}
              placeholder="مثال: WH-CUT-02"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">نوع الموقع</label>
            <select
              value={newBranchType}
              onChange={(e) => setNewBranchType(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="factory">مصنع / صالة إنتاج</option>
              <option value="warehouse">مخزن أقمشة ومستلزمات</option>
              <option value="outlet">منفذ بيع أو معرض توزيع</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsBranchModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              حفظ الفرع
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Fabric Calculator */}
      <FabricCalculatorModal
        isOpen={isFabricCalcOpen}
        onClose={() => setIsFabricCalcOpen(false)}
      />

      {/* MODAL 4: Stock Transaction Modal */}
      <StockTransactionModal
        isOpen={selectedStockItem !== null}
        onClose={() => setSelectedStockItem(null)}
        item={selectedStockItem}
        onSuccess={handleStockTransactionSuccess}
      />

      {/* MODAL 5: Create Garment Model Modal */}
      <CreateModelModal
        isOpen={isCreateModelOpen}
        onClose={() => setIsCreateModelOpen(false)}
        onSuccess={handleModelCreated}
      />

      {/* MODAL 6: Create Purchase Order Modal */}
      <CreatePurchaseOrderModal
        isOpen={isCreatePoModalOpen}
        onClose={() => setIsCreatePoModalOpen(false)}
        suppliers={suppliers}
        warehouses={warehouses}
        items={inventoryItems}
        onSuccess={(newPo) => {
          setPurchaseOrders((prev) => [newPo, ...prev]);
          setIsCreatePoModalOpen(false);
        }}
      />

      {/* MODAL 7: Receive Goods & Quality Inspection (GRN) */}
      <ReceiveGoodsModal
        isOpen={selectedPoForReceipt !== null}
        onClose={() => setSelectedPoForReceipt(null)}
        purchaseOrder={selectedPoForReceipt}
        onSuccess={(updatedPo, newGrn) => {
          setPurchaseOrders((prev) =>
            prev.map((p) => (p.id === updatedPo.id ? updatedPo : p))
          );
          setGoodsReceiptNotes((prev) => [newGrn, ...prev]);
          setSelectedPoForReceipt(null);
        }}
      />

      {/* MODAL 8: 3-Way Matching & Supplier Invoice */}
      <SupplierInvoiceModal
        isOpen={selectedPoForInvoice !== null}
        onClose={() => setSelectedPoForInvoice(null)}
        purchaseOrder={selectedPoForInvoice}
        goodsReceiptNote={
          goodsReceiptNotes.find((g) => g.po_number === selectedPoForInvoice?.po_number) || null
        }
        onSuccess={(newInvoice) => {
          setSupplierInvoices((prev) => [newInvoice, ...prev]);
          setSelectedPoForInvoice(null);
        }}
      />

      {/* MODAL 9: Create Supplier Modal */}
      <CreateSupplierModal
        isOpen={isCreateSupplierModalOpen}
        onClose={() => setIsCreateSupplierModalOpen(false)}
        onSuccess={(newSupplier) => {
          setSuppliers((prev) => [...prev, newSupplier]);
          setIsCreateSupplierModalOpen(false);
        }}
      />

      {/* MODAL 10: Create Production Order Modal */}
      <CreateProductionOrderModal
        isOpen={isCreateProdOrderModalOpen}
        onClose={() => setIsCreateProdOrderModalOpen(false)}
        models={models}
        onSuccess={(newOrder) => {
          setProductionOrders((prev) => [newOrder, ...prev]);
          setIsCreateProdOrderModalOpen(false);
        }}
      />

      {/* MODAL 11: Cutting Order & Lay Execution Modal */}
      <CuttingOrderModal
        isOpen={selectedProdOrderForCut !== null}
        onClose={() => setSelectedProdOrderForCut(null)}
        productionOrder={selectedProdOrderForCut}
        warehouses={warehouses}
        fabricItems={inventoryItems.filter((i) => i.unit_of_measure === 'meter' || i.unit_of_measure === 'm' || i.name.includes('قماش'))}
        customerMaterials={customerMaterials}
        onSuccess={(newCut, newBundles) => {
          setCuttingOrders((prev) => [newCut, ...prev]);
          setCuttingBundles((prev) => [...newBundles, ...prev]);
          setProductionOrders((prev) =>
            prev.map((p) =>
              p.id === newCut.production_order_id
                ? {
                    ...p,
                    status: 'in_progress',
                    cut_quantity: (p.cut_quantity || 0) + newCut.total_cut_pieces,
                  }
                : p
            )
          );
          setSelectedProdOrderForCut(null);
        }}
      />

      {/* MODAL 12: Bundle Stage Tracker Modal */}
      <BundleTrackerModal
        isOpen={selectedBundleForTracker !== null}
        onClose={() => setSelectedBundleForTracker(null)}
        bundle={selectedBundleForTracker}
        onTransferSuccess={(updated) => {
          setCuttingBundles((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b))
          );
          setSelectedBundleForTracker(null);
        }}
      />

      {/* MODAL 13: Quality Inspection & QC Defects Modal */}
      <QualityInspectionModal
        isOpen={selectedProdOrderForQc !== null}
        onClose={() => setSelectedProdOrderForQc(null)}
        productionOrder={selectedProdOrderForQc}
        onSuccess={(newQc) => {
          setQualityInspections((prev) => [newQc, ...prev]);
          setProductionOrders((prev) =>
            prev.map((p) => {
              if (p.id !== newQc.production_order_id) return p;
              const newCompleted = (p.completed_quantity || p.qc_passed_quantity || 0) + newQc.passed_quantity;
              const target = p.planned_quantity || p.target_quantity;
              return {
                ...p,
                completed_quantity: newCompleted,
                qc_passed_quantity: newCompleted,
                rework_quantity: (p.rework_quantity || 0) + newQc.rework_quantity,
                scrapped_quantity: (p.scrapped_quantity || 0) + newQc.rejected_quantity,
                status: newCompleted >= target ? 'completed' : p.status,
              };
            })
          );
          setSelectedProdOrderForQc(null);
        }}
      />
    </AppLayout>
  );
}

export default App;
