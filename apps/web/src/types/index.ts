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
  size_name: string;
  color_name: string;
  color_code: string;
  wholesale_price: number;
  retail_price: number;
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
