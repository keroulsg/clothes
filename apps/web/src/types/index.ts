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
  items_count: number;
}

export interface InventoryItem {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  item_type: 'fabric_raw' | 'accessory_raw' | 'finished_good' | 'packaging';
  code: string;
  name: string;
  unit_of_measure: string;
  current_balance: number;
  average_cost: number;
  reorder_level: number;
  is_customer_owned: boolean;
  customer_name?: string;
  technical_specs?: {
    gsm?: number;
    usable_width_meters?: number;
    fiber_composition?: string;
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
  notes?: string;
  is_active: boolean;
  job_orders_count?: number;
  material_receipts_count?: number;
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
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
}

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  sales_order_id?: string;
  customer_name: string;
  customer_id?: string;
  invoice_type: 'standard' | 'pos_receipt' | 'tax_invoice';
  status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'void';
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

// Phase 9: HR, Employees & Piece-Rate Payroll
export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  department: string;
  job_title: string;
  pay_type: 'piece_rate' | 'fixed_salary' | 'hourly' | 'hybrid';
  base_salary: number;
  phone?: string;
  national_id?: string;
  is_active: boolean;
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
  completed_quantity: number;
  unit_rate: number;
  total_amount: number;
  work_date: string;
  status: string;
  employee?: Employee;
}

export interface PayrollItem {
  id: string;
  employee_id: string;
  base_amount: number;
  piece_rate_earnings: number;
  overtime_earnings: number;
  deductions_and_advances: number;
  net_salary: number;
  is_paid: boolean;
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
  status: 'draft' | 'approved' | 'paid';
  items?: PayrollItem[];
}

// Phase 10: E-Commerce Storefront
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
  payment_method: string;
  status: 'new' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  created_at: string;
  items?: StoreOrderItem[];
}

export interface TenantStoreSetting {
  id: string;
  store_name: string;
  subdomain?: string;
  is_store_enabled: boolean;
  allow_cod: boolean;
  allow_card_payment: boolean;
  currency: string;
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


