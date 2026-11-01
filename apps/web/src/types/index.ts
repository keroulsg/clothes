export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface Tenant {
  id: string;
  code: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial' | 'past_due';
  plan_tier: 'starter' | 'professional' | 'enterprise';
  currency: string;
  created_at: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  type: 'factory' | 'outlet' | 'warehouse' | 'head_office';
  is_main: boolean;
  address?: string;
  phone?: string;
}

export interface ProductionOrderItem {
  id: string;
  production_order_id?: string;
  color_id: string;
  color_name: string;
  size_id: string;
  size_name: string;
  planned_quantity: number;
  cut_quantity: number;
  completed_quantity: number;
}

export interface ProductionOrder {
  id: string;
  order_number: string;
  garment_model_id?: string;
  model_name: string;
  model_code: string;
  category: string;
  target_quantity: number;
  planned_quantity?: number;
  cut_quantity: number;
  sewn_quantity?: number;
  qc_passed_quantity?: number;
  completed_quantity?: number;
  scrapped_quantity?: number;
  rework_quantity?: number;
  waste_percentage?: number;
  status: 'draft' | 'approved' | 'cutting' | 'sewing' | 'in_progress' | 'qc' | 'completed' | 'cancelled';
  priority?: 'normal' | 'high' | 'urgent';
  due_date: string;
  target_delivery_date?: string;
  items?: ProductionOrderItem[];
}

export interface GarmentModel {
  id: string;
  code: string;
  name: string;
  category: string;
  season: string;
  target_cost: number;
  wholesale_price: number;
  retail_price: number;
  variants_count: number;
  status: 'active' | 'draft' | 'discontinued';
  created_at: string;
}

export interface ProductVariant {
  id: string;
  garment_model_id: string;
  sku: string;
  barcode: string;
  size_name?: string;
  color_name?: string;
  color_code?: string;
  wholesale_price: number;
  retail_price: number;
  garment_model?: GarmentModel;
  size?: { id: string; name: string };
  color?: { id: string; name: string };
}


export interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: 'fabric' | 'accessories' | 'wip' | 'finished_goods' | 'returns' | 'customer_deposits';
  allow_negative_stock: boolean;
  items_count?: number;
  address?: string;
  branch_id?: string;
}

export interface InventoryItem {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  variant_id?: string;
  item_type: 'fabric_raw' | 'accessory_raw' | 'finished_good' | 'packaging' | 'fabric' | 'accessory' | 'finished_product' | 'yarn' | 'thread' | 'trims';
  code: string;
  name: string;
  unit_of_measure: string;
  current_balance: number;
  average_cost: number;
  reorder_level: number;
  is_customer_owned: boolean;
  customer_name?: string;
  storage_zone?: string;
  rack_location?: string;
  shelf_bin_location?: string;
  reserved_quantity?: number;
  available_quantity?: number;
  variant?: ProductVariant;
  warehouse?: Warehouse;
  technical_specs?: {
    gsm?: number;
    usable_width_meters?: number;
    fiber_composition?: string;
    storage_zone?: string;
    rack_location?: string;
    shelf_bin_location?: string;
    roll_count?: number;
    roll_number?: string;
    color?: string;
    size?: string;
    [key: string]: any;
  };
}

export interface InventoryTransaction {
  id: string;
  item_code: string;
  item_name: string;
  warehouse_name: string;
  transaction_type: 'goods_receipt' | 'material_issuance' | 'adjustment_positive' | 'adjustment_negative' | 'transfer_in' | 'transfer_out';
  direction: 'IN' | 'OUT';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  balance_before: number;
  balance_after: number;
  reference_type?: string;
  reference_number?: string;
  created_at: string;
}

export interface CustomerMaterial {
  id: string;
  customer_name: string;
  fabric_name: string;
  fabric_code: string;
  gsm: number;
  usable_width_meters: number;
  received_meters: number;
  consumed_meters: number;
  waste_meters: number;
  remaining_meters: number;
  warehouse_name: string;
}

export interface FabricConversionResult {
  meters?: number;
  weight_kg?: number;
  usable_width_meters: number;
  gsm: number;
  linear_weight_grams_per_meter: number;
  calculated_weight_kg?: number;
  calculated_meters?: number;
  formula: string;
  technical_note: string;
}

// Procurement & Vendor Models
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  tax_id?: string;
  payment_terms: string;
  current_balance: number;
}

export interface PurchaseOrderItem {
  id: string;
  inventory_item_id: string;
  item_name: string;
  item_code: string;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  warehouse_id: string;
  warehouse_name: string;
  order_date: string;
  expected_delivery_date?: string;
  status: 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items: PurchaseOrderItem[];
}

export interface GoodsReceiptNote {
  id: string;
  grn_number: string;
  po_number: string;
  supplier_name: string;
  warehouse_name: string;
  receipt_date: string;
  quality_inspector_name: string;
  inspection_status: 'passed' | 'partial_pass' | 'failed';
  accepted_quantity: number;
  rejected_quantity: number;
  rejection_reason?: string;
}

export interface SupplierInvoice {
  id: string;
  invoice_number: string;
  internal_reference: string;
  supplier_name: string;
  po_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  matching_status: 'matched' | 'price_variance' | 'quantity_variance';
  variance_notes?: string;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
}

export interface Pattern {
  id: string;
  garment_model_id: string;
  pattern_code: string;
  pattern_name: string;
  version: string;
  sample_size?: string;
  usable_width_meters: number;
  grain_direction: string;
  relaxation_hours_required: number;
  estimated_shrinkage_percent: number;
  is_active: boolean;
}

export interface BomItem {
  id: string;
  bill_of_material_id?: string;
  inventory_item_id: string;
  item_name?: string;
  component_type: 'fabric' | 'lining' | 'thread' | 'button' | 'zipper' | 'elastic' | 'label' | 'packaging' | 'other';
  consumption_per_unit: number;
  unit_of_measure: string;
  waste_tolerance_percent: number;
  unit_cost: number;
}

export interface BillOfMaterial {
  id: string;
  garment_model_id: string;
  model_name?: string;
  version: string;
  bom_code: string;
  name: string;
  status: 'draft' | 'approved' | 'archived';
  total_estimated_cost_per_piece: number;
  is_active: boolean;
  items: BomItem[];
}

export interface CuttingOrder {
  id: string;
  cutting_order_number: string;
  production_order_id: string;
  production_order_number?: string;
  model_name?: string;
  table_number: string;
  fabric_name?: string;
  fabric_source: 'factory_owned' | 'customer_deposit';
  customer_material_name?: string;
  warehouse_name?: string;
  lay_length_meters: number;
  layers_count: number;
  marker_efficiency_percent: number;
  actual_fabric_meters_used: number;
  theoretical_fabric_meters: number;
  end_loss_meters: number;
  total_cut_pieces: number;
  status: 'planned' | 'spreading' | 'cut_completed';
  created_at?: string;
}

export interface CuttingBundle {
  id: string;
  bundle_code: string;
  cutting_order_id: string;
  production_order_id: string;
  bundle_number: number;
  color_name: string;
  size_name: string;
  quantity: number;
  current_stage_code: 'cutting' | 'assembly' | 'sewing' | 'finishing' | 'ironing' | 'packing' | 'completed';
  status: 'active' | 'held_for_qc' | 'rework' | 'completed' | 'scrapped';
  notes?: string;
}

export interface QualityDefect {
  id?: string;
  defect_type: string;
  severity: 'minor' | 'major' | 'critical';
  quantity: number;
  corrective_action?: string;
}

export interface QualityInspection {
  id: string;
  inspection_number: string;
  production_order_id: string;
  production_order_number?: string;
  bundle_code?: string;
  inspector_name: string;
  inspection_type: 'inline' | 'end_of_line' | 'final_audit';
  inspected_quantity: number;
  passed_quantity: number;
  rejected_quantity: number;
  rework_quantity: number;
  decision: 'passed' | 'rework_required' | 'rejected';
  defects?: QualityDefect[];
  created_at?: string;
}

// Phase 6: Subcontracting & CMT Services
export interface Customer {
  id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  address?: string;
  credit_limit?: number;
  notes?: string;
  is_active: boolean;
  job_orders_count?: number;
  material_receipts_count?: number;
  sales_orders_count?: number;
  sales_invoices_count?: number;
  current_balance?: number;
  total_invoiced?: number;
}

export interface CustomerStatementLine {
  id: string;
  date: string;
  type: 'invoice' | 'return';
  type_label: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  payment_status: string;
}

export interface CustomerStatement {
  customer: Customer;
  summary: {
    total_invoiced: number;
    total_paid: number;
    total_refunded: number;
    closing_balance: number;
    total_transactions: number;
  };
  lines: CustomerStatementLine[];
}

export interface AccountStatementLine {
  id: string;
  entry_id: string;
  entry_number?: string;
  entry_date?: string;
  reference_type?: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface AccountStatement {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
    category: string;
    opening_balance?: number;
    current_balance: number;
  };
  summary: {
    opening_balance: number;
    total_debit: number;
    total_credit: number;
    closing_balance: number;
    total_transactions: number;
  };
  lines: AccountStatementLine[];
}

export interface JobOrderItem {
  id?: string;
  job_order_id?: string;
  color_id?: string;
  color_name?: string;
  size_id?: string;
  size_name?: string;
  product_variant_id?: string;
  target_quantity: number;
  cut_quantity?: number;
  completed_quantity?: number;
  delivered_quantity?: number;
  unit_rate: number;
}

export interface JobOrder {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  service_type: 'contract_cutting' | 'cmt';
  garment_model_id?: string;
  model_name?: string;
  production_order_id?: string;
  fabric_source: 'customer_supplied' | 'factory_supplied' | 'mixed';
  trims_responsibility: 'customer_supplied' | 'factory_supplied' | 'mixed';
  status: 'draft' | 'confirmed' | 'materials_received' | 'in_progress' | 'quality_review' | 'ready_for_delivery' | 'partially_delivered' | 'completed' | 'cancelled';
  pricing_basis: 'per_piece' | 'per_meter' | 'per_operation' | 'per_bundle';
  unit_rate: number;
  total_target_quantity: number;
  total_received_meters: number;
  total_cut_quantity: number;
  total_accepted_quantity: number;
  total_rejected_quantity: number;
  total_rework_quantity: number;
  total_delivered_quantity: number;
  planned_start_date?: string;
  target_delivery_date?: string;
  actual_start_date?: string;
  actual_completion_date?: string;
  notes?: string;
  created_at: string;
  items?: JobOrderItem[];
  customer?: Customer;
}

export interface CustomerMaterialReceipt {
  id: string;
  receipt_number: string;
  job_order_id?: string;
  customer_id?: string;
  customer_name: string;
  warehouse_id: string;
  warehouse_name?: string;
  fabric_name: string;
  fabric_code?: string;
  received_meters: number;
  received_weight_kg?: number;
  usable_width_meters: number;
  gsm: number;
  rolls_count: number;
  condition_status: 'accepted' | 'damaged_rolls' | 'conditional_pass';
  inspector_name?: string;
  notes?: string;
  created_at: string;
}

export interface ExternalOperation {
  id: string;
  operation_number: string;
  job_order_id?: string;
  production_order_id?: string;
  cutting_bundle_id?: string;
  subcontractor_name: string;
  operation_type: 'embroidery' | 'printing' | 'washing' | 'finishing' | 'dyeing' | 'overlocking' | 'other';
  sent_quantity: number;
  received_accepted_quantity: number;
  received_rejected_quantity: number;
  scrap_quantity: number;
  unit_rate: number;
  total_cost: number;
  status: 'dispatched' | 'partially_returned' | 'completed' | 'cancelled';
  dispatched_at?: string;
  returned_at?: string;
  notes?: string;
}

export interface JobDeliveryItem {
  id?: string;
  job_delivery_note_id?: string;
  job_order_item_id?: string;
  color_name?: string;
  size_name?: string;
  delivered_quantity: number;
}

export interface JobDeliveryNote {
  id: string;
  delivery_number: string;
  job_order_id: string;
  order_number?: string;
  customer_name: string;
  delivery_date: string;
  status: 'draft' | 'confirmed' | 'delivered' | 'cancelled';
  total_delivered_pieces: number;
  returned_unused_fabric_meters: number;
  scrap_fabric_meters: number;
  delivered_by?: string;
  received_by_customer?: string;
  notes?: string;
  items?: JobDeliveryItem[];
}

export interface JobInvoiceItem {
  id?: string;
  job_invoice_id?: string;
  description: string;
  item_type: 'service_charge' | 'extra_operation' | 'trim_charge' | 'deduction' | 'tax';
  quantity: number;
  unit_rate: number;
  total_amount: number;
  reason?: string;
}

export interface JobInvoice {
  id: string;
  invoice_number: string;
  job_order_id: string;
  order_number?: string;
  customer_name: string;
  invoice_date: string;
  due_date?: string;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'voided';
  service_amount: number;
  additional_charges: number;
  deductions: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  notes?: string;
  items?: JobInvoiceItem[];
}

export interface JobProfitability {
  job_order_id: string;
  order_number: string;
  customer_name: string;
  service_type: string;
  status: string;
  total_target_pieces: number;
  total_delivered_pieces: number;
  total_received_meters: number;
  service_revenue: number;
  external_operations_cost: number;
  factory_materials_cost: number;
  customer_materials_cost: number;
  total_direct_cost: number;
  gross_margin: number;
  margin_percentage: number;
  metric_label: string;
  notes: string;
}

// Phase 7: Sales, Quotations, Orders, Invoices, POS
export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
  variant_id?: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_id?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  valid_until?: string;
  notes?: string;
  items?: QuotationItem[];
}

export interface SalesOrderItem {
  id: string;
  variant_id: string;
  inventory_item_id?: string;
  ordered_quantity: number;
  reserved_quantity: number;
  fulfilled_quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
  variant?: ProductVariant;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_id?: string;
  quotation_id?: string;
  warehouse_id?: string;
  order_type: 'wholesale' | 'retail' | 'outlet' | 'custom';
  status: 'draft' | 'confirmed' | 'reserved' | 'in_fulfillment' | 'fulfilled' | 'cancelled';
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  expected_delivery_date?: string;
  notes?: string;
  items?: SalesOrderItem[];
}

export interface SalesInvoiceItem {
  id: string;
  variant_id?: string;
  inventory_item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
  returned_quantity?: number;
  remaining_returnable_quantity?: number;
  variant?: ProductVariant;
}

export interface SalesReturnItem {
  id?: string;
  sales_return_id?: string;
  variant_id: string;
  inventory_item_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  condition?: 'good' | 'defective' | 'scrap';
  action_taken?: 'restock' | 'repair' | 'discard';
  variant?: ProductVariant;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  customer_id?: string;
  sales_order_id?: string;
  sales_invoice_id?: string;
  warehouse_id: string;
  return_date: string;
  total_amount: number;
  refund_status: 'pending' | 'credited' | 'refunded' | 'partially_refunded';
  status: 'draft' | 'received' | 'inspected' | 'restocked' | 'rejected';
  reason: string;
  notes?: string;
  is_restocked: boolean;
  created_at?: string;
  customer?: Customer;
  salesInvoice?: SalesInvoice;
  items?: SalesReturnItem[];
}

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  sales_order_id?: string;
  customer_name: string;
  customer_id?: string;
  invoice_type: 'standard' | 'pos_receipt' | 'tax_invoice';
  status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'void' | 'refunded' | 'credited' | 'partially_refunded' | 'partially_credited';
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'check';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  invoice_date: string;
  due_date?: string;
  items?: SalesInvoiceItem[];
  tenant?: {
    id: string;
    code: string;
    name: string;
    settings?: Record<string, any>;
  };
}

export interface PosSession {
  id: string;
  session_code: string;
  opening_cash: number;
  closing_cash?: number;
  total_sales: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

// Phase 8: Financials, Accounting & Costing
export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  current_balance: number;
  is_active: boolean;
}

export interface JournalEntryLine {
  id: string;
  account_id: string;
  description?: string;
  debit: number;
  credit: number;
  cost_center?: string;
  account?: ChartOfAccount;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  reference_type?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'void';
  lines?: JournalEntryLine[];
}

export interface PaymentVoucher {
  id: string;
  voucher_number: string;
  voucher_type: 'receipt' | 'payment';
  party_type: 'customer' | 'supplier' | 'employee' | 'other';
  party_name: string;
  payment_method: string;
  amount: number;
  voucher_date: string;
  notes?: string;
  account?: ChartOfAccount;
}

export interface ProductionCostSheet {
  id: string;
  production_order_id: string;
  garment_model_id: string;
  total_produced_pieces: number;
  direct_materials_cost: number;
  direct_labor_cost: number;
  subcontracted_services_cost: number;
  allocated_overhead_cost: number;
  total_cost: number;
  cost_per_piece: number;
  status: string;
}

// Phase C: Complete Workforce, Attendance, Adjustments & Payroll Management
export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  department: string;
  job_title: string;
  pay_type: 'piece_rate' | 'fixed_salary' | 'hourly' | 'daily' | 'hybrid';
  base_salary: number;
  hourly_rate?: number;
  daily_rate?: number;
  shift_name?: string;
  hire_date?: string;
  termination_date?: string;
  branch_id?: string;
  branch?: { id: string; name: string; code: string };
  phone?: string;
  national_id?: string;
  is_active: boolean;
  piece_work_logs_count?: number;
}

export interface Attendance {
  id: string;
  tenant_id: string;
  employee_id: string;
  branch_id?: string;
  attendance_date: string;
  check_in?: string;
  check_out?: string;
  total_hours: number;
  overtime_hours: number;
  late_minutes: number;
  early_leaving_minutes: number;
  status: 'present' | 'absent' | 'leave' | 'late' | 'half_day';
  is_payable: boolean;
  correction_reason?: string;
  corrected_by?: number;
  created_at: string;
  employee?: Employee;
  corrector?: { id: number; name: string };
}

export interface EmployeeAdjustment {
  id: string;
  tenant_id: string;
  employee_id: string;
  type: 'advance' | 'bonus' | 'allowance' | 'deduction';
  amount: number;
  effective_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  payroll_id?: string;
  created_at: string;
  employee?: Employee;
  approver?: { id: number; name: string };
}

export interface PayrollPayment {
  id: string;
  tenant_id: string;
  payroll_id: string;
  employee_id?: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'instapay' | 'cheque';
  reference_number?: string;
  notes?: string;
  paid_by: number;
  created_at: string;
  employee?: Employee;
  payer?: { id: number; name: string };
}

export interface PieceRate {
  id: string;
  stage_name: string;
  operation_name: string;
  rate_per_piece: number;
  is_active: boolean;
}

export interface PieceWorkLog {
  id: string;
  employee_id: string;
  production_order_id?: string;
  cutting_bundle_id?: string;
  completed_quantity: number;
  unit_rate: number;
  total_amount: number;
  work_date: string;
  status: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  employee?: Employee;
}

export interface QualityDefectAdjustment {
  id: string;
  tenant_id: string;
  employee_id: string;
  production_order_id: string;
  cutting_bundle_id?: string;
  quality_defect_id?: string;
  quality_inspection_id?: string;
  production_stage_id?: string;
  investigation_notes?: string;
  proposed_penalty_amount: number;
  adjustment_reason: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'objected' | 'settled' | 'reversed';
  reported_by?: number;
  approved_by?: number;
  approved_at?: string;
  worker_objection_notes?: string;
  objection_submitted_at?: string;
  settled_payroll_id?: string;
  settled_payroll_item_id?: string;
  reversal_reason?: string;
  reversed_by?: number;
  reversed_at?: string;
  created_at: string;
  employee?: Employee;
  approver?: { id: number; name: string };
  reporter?: { id: number; name: string };
  reverser?: { id: number; name: string };
}

export interface PayrollItem {
  id: string;
  payroll_id?: string;
  employee_id: string;
  base_amount: number;
  piece_rate_earnings: number;
  hourly_earnings?: number;
  daily_earnings?: number;
  overtime_earnings: number;
  allowances_and_bonuses?: number;
  advances_repaid?: number;
  defect_deductions?: number;
  general_deductions?: number;
  deductions_and_advances: number;
  gross_amount?: number;
  net_salary: number;
  paid_amount?: number;
  balance_due?: number;
  is_paid: boolean;
  calculation_breakdown?: {
    pay_type: string;
    base_salary?: number;
    piece_rate?: { count: number; total_amount: number };
    hourly?: { hours: number; rate: number; earnings: number; overtime_hours: number; overtime_earnings: number };
    daily?: { days: number; rate: number; earnings: number };
    adjustments?: { advances: number; bonuses_allowances: number; general_deductions: number };
    defect_deductions?: { count: number; total: number; details: any[] };
    summary: { gross: number; total_deductions: number; net: number };
  };
  employee?: Employee;
}

export interface Payroll {
  id: string;
  payroll_period: string;
  period_start: string;
  period_end: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_paid?: number;
  remaining_balance?: number;
  status: 'draft' | 'approved' | 'rejected' | 'finalized' | 'partially_paid' | 'paid';
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  finalized_by?: number;
  finalized_at?: string;
  notes?: string;
  items?: PayrollItem[];
  payments?: PayrollPayment[];
  approver?: { id: number; name: string };
  finalizer?: { id: number; name: string };
}

// Phase 10: E-Commerce Storefront & Theme Architecture
export type StorefrontThemeId = 'modern_fashion' | 'kids_baby' | 'premium_brand' | 'wholesale_uniform';

export interface ThemeConfig {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  bg_color?: string;
  font_family?: string;
  direction?: 'rtl' | 'ltr';
  logo_url?: string;
  banner_image?: string;
}

export interface StorefrontThemeMeta {
  id: StorefrontThemeId;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  default_palette: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
  };
}

export interface StoreOrderItem {
  id: string;
  variant_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface StoreOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  payment_method: 'cod' | 'card_mock' | 'instapay' | string;
  payment_status: 'pending' | 'cod_pending' | 'pending_review' | 'verified_paid' | 'rejected';
  instapay_reference?: string;
  instapay_receipt_url?: string;
  payment_reviewed_by?: string;
  payment_reviewed_at?: string;
  payment_rejection_reason?: string;
  status: 'new' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  inventory_synced?: boolean;
  created_at: string;
  items?: StoreOrderItem[];
  payment_reviewer?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TenantStoreSetting {
  id: string;
  store_name: string;
  theme_id: StorefrontThemeId;
  theme_config?: ThemeConfig;
  subdomain?: string;
  is_store_enabled: boolean;
  allow_cod: boolean;
  allow_card_payment: boolean;
  allow_instapay: boolean;
  instapay_account_name?: string;
  instapay_handle?: string;
  instapay_instructions?: string;
  currency: string;
  direction?: 'rtl' | 'ltr';
  banner_title?: string;
  banner_subtitle?: string;
  contact_whatsapp?: string;
}

// Phase 12: Machine & Asset Maintenance
export interface Machine {
  id: string;
  machine_code: string;
  name: string;
  model_number?: string;
  serial_number?: string;
  machine_type: 'sewing' | 'cutting' | 'ironing' | 'overlock' | 'buttonhole' | 'boiler' | 'compressor' | 'other';
  location?: string;
  purchase_date?: string;
  warranty_expiry_date?: string;
  status: 'operational' | 'under_maintenance' | 'breakdown' | 'retired';
  maintenance_interval_days: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  notes?: string;
  work_orders_count?: number;
}

export interface MaintenanceSparePart {
  id?: string;
  work_order_id?: string;
  inventory_item_id?: string;
  part_name: string;
  part_number?: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
}

export interface MaintenanceWorkOrder {
  id: string;
  machine_id: string;
  order_number: string;
  work_type: 'preventive' | 'breakdown' | 'emergency' | 'calibration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  issue_description: string;
  resolution_notes?: string;
  reported_by?: string;
  technician_name?: string;
  downtime_hours: number;
  spare_parts_cost: number;
  labor_cost: number;
  total_cost: number;
  scheduled_date?: string;
  start_time?: string;
  completion_time?: string;
  created_at: string;
  machine?: Machine;
  spare_parts?: MaintenanceSparePart[];
}

export interface DowntimeSummary {
  total_machines: number;
  operational_machines: number;
  down_machines: number;
  total_downtime_hours: number;
  total_maintenance_cost: number;
}

// Commercial SaaS Subscription Plans & Usage Metering
export interface SubscriptionPlanMeter {
  id: string;
  plan_id: string;
  meter_key: string;
  quota_limit: number;
  period_type: 'monthly' | 'current_count' | 'lifetime';
  limit_type: 'hard' | 'soft';
  overage_unit_price: number;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  monthly_price: number;
  annual_price: number;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  features?: string[];
  meters?: SubscriptionPlanMeter[];
}

export interface MeterUsageItem {
  meter_key: string;
  name_ar: string;
  name_en: string;
  unit: string;
  limit_type: 'hard' | 'soft';
  current_usage: number;
  limit: number;
  percent_used: number;
  is_warning_70: boolean;
  is_warning_85: boolean;
  is_exceeded: boolean;
}

export interface TenantSubscriptionReport {
  tenant_id: string;
  subscription: {
    plan_code: string;
    plan_name_ar: string;
    plan_name_en: string;
    monthly_price: number;
    status: string;
    billing_cycle: string;
    current_period_start: string;
    current_period_end: string;
  };
  meters: Record<string, MeterUsageItem>;
}

export interface SubscriptionQuotaOverride {
  id: string;
  tenant_id: string;
  meter_key: string;
  temporary_limit: number;
  reason: string;
  granted_by: string;
  expires_at: string;
  is_active: boolean;
}

// Phase G: Waslat Worsh Integrated B2B Marketplace
export interface WorkshopProfile {
  id: string;
  tenant_id?: string;
  workshop_name: string;
  specialty_type: 'sewing' | 'cutting' | 'embroidery' | 'printing' | 'finishing' | 'full_cmt';
  active_machines_count: number;
  daily_capacity_pieces: number;
  governorate: string;
  city?: string;
  address?: string;
  phone: string;
  contact_person: string;
  is_verified: boolean;
  rating_average: number;
  completed_jobs_count: number;
  created_at: string;
  tenant?: any;
}

export interface RfqBid {
  id: string;
  rfq_id: string;
  workshop_profile_id: string;
  unit_rate: number;
  promised_lead_days: number;
  notes?: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
  converted_job_order_id?: string;
  created_at: string;
  workshop?: WorkshopProfile;
}

export interface Rfq {
  id: string;
  tenant_id: string;
  rfq_number: string;
  title: string;
  service_type: 'sewing' | 'cutting' | 'embroidery' | 'printing' | 'full_cmt';
  specifications: string;
  target_quantity: number;
  expected_delivery_date: string;
  max_budget_per_piece?: number;
  fabric_responsibility: 'seeker_provided' | 'workshop_sourced';
  status: 'open' | 'awarded' | 'in_progress' | 'completed' | 'cancelled';
  awarded_bid_id?: string;
  created_at: string;
  tenant?: any;
  bids?: RfqBid[];
  awarded_bid?: RfqBid;
}

export interface MarketplaceCommission {
  id: string;
  tenant_id: string;
  rfq_id: string;
  rfq_bid_id: string;
  job_order_id?: string;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'collected' | 'waived';
  created_at: string;
}

export interface WorkshopReview {
  id: string;
  rfq_id: string;
  workshop_profile_id: string;
  reviewer_tenant_id: string;
  quality_rating: number;
  timeliness_rating: number;
  communication_rating: number;
  review_notes?: string;
  created_at: string;
  workshop?: WorkshopProfile;
  reviewer_tenant?: any;
}




