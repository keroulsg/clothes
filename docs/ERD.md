# GarmentOS Cloud — مخطط الكيانات والعلاقات (Entity Relationship Diagram - ERD)

## 1. مقدمة معمارية
يوثق هذا المخطط هيكلية العلاقات بين الجداول لقاعدة بيانات **GarmentOS Cloud** مع مراعاة العزل المتعدد للشركات (Multi-Tenancy) وقيود التكامل المرجعي (Foreign Keys).

---

## 2. مخطط العلاقات الرئيسي لـ Multi-Tenancy والصلاحيات

```mermaid
erDiagram
    TENANTS ||--o{ TENANT_SETTINGS : has
    TENANTS ||--o{ TENANT_DOMAINS : has
    TENANTS ||--o{ BRANCHES : operates
    TENANTS ||--o{ USERS : employs
    TENANTS ||--o{ SUBSCRIPTIONS : subscribes
    PLANS ||--o{ SUBSCRIPTIONS : offers
    PLANS ||--o{ PLAN_FEATURES : includes
    SUBSCRIPTIONS ||--o{ SUBSCRIPTION_INVOICES : bills
    SUBSCRIPTION_INVOICES ||--o{ PAYMENTS : pays

    TENANTS ||--o{ ROLES : defines
    ROLES ||--o{ ROLE_PERMISSIONS : maps
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : mapped_to
    USERS ||--o{ USER_ROLES : assigned

    TENANTS {
        uuid id PK
        string code UK
        string name
        string status
        timestamp created_at
    }

    USERS {
        uuid id PK
        uuid tenant_id FK
        string name
        string email
        string password_hash
        boolean is_active
        timestamp created_at
    }

    ROLES {
        uuid id PK
        uuid tenant_id FK
        string name
        string slug
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid tenant_id FK
        uuid plan_id FK
        string status
        timestamp starts_at
        timestamp ends_at
    }
```

---

## 3. مخطط علاقات الموديلات والمخازن ودفتر الأستاذ (Catalog & Inventory)

```mermaid
erDiagram
    TENANTS ||--o{ GARMENT_MODELS : owns
    GARMENT_MODELS ||--o{ PRODUCT_VARIANTS : generates
    COLORS ||--o{ PRODUCT_VARIANTS : colored_as
    SIZES ||--o{ PRODUCT_VARIANTS : sized_as

    TENANTS ||--o{ WAREHOUSES : operates
    TENANTS ||--o{ INVENTORY_ITEMS : catalogues
    INVENTORY_ITEMS ||--o{ INVENTORY_TRANSACTIONS : logs
    WAREHOUSES ||--o{ INVENTORY_TRANSACTIONS : stored_at
    PRODUCT_VARIANTS ||--o{ INVENTORY_ITEMS : represents

    GARMENT_MODELS {
        uuid id PK
        uuid tenant_id FK
        string code UK
        string name
        string category
        decimal target_cost
        decimal wholesale_price
    }

    PRODUCT_VARIANTS {
        uuid id PK
        uuid tenant_id FK
        uuid model_id FK
        uuid size_id FK
        uuid color_id FK
        string sku UK
        string barcode UK
    }

    INVENTORY_ITEMS {
        uuid id PK
        uuid tenant_id FK
        uuid variant_id FK
        string item_type
        decimal current_balance
        decimal reorder_level
    }

    INVENTORY_TRANSACTIONS {
        uuid id PK
        uuid tenant_id FK
        uuid item_id FK
        uuid warehouse_id FK
        string transaction_type
        decimal quantity
        decimal unit_cost
        string reference_type
        uuid reference_id
        timestamp transaction_time
    }
```

---

## 4. مخطط علاقات تشغيل الإنتاج وقسم القص والجودة (Production, Cutting & QC)

```mermaid
erDiagram
    GARMENT_MODELS ||--o{ BILL_OF_MATERIALS : specifies
    INVENTORY_ITEMS ||--o{ BILL_OF_MATERIALS : consumes_material

    GARMENT_MODELS ||--o{ PRODUCTION_ORDERS : drives
    PRODUCTION_ORDERS ||--o{ PRODUCTION_ORDER_ITEMS : targets
    PRODUCTION_ORDERS ||--o{ CUTTING_ORDERS : executes_in_cutting
    CUTTING_ORDERS ||--o{ CUTTING_BUNDLES : produces_bundles
    CUTTING_BUNDLES ||--o{ STAGE_OPERATIONS_LOG : stitched_in_stages
    STAGE_OPERATIONS_LOG ||--o{ QUALITY_INSPECTIONS : inspected_by

    PRODUCTION_ORDERS {
        uuid id PK
        uuid tenant_id FK
        uuid model_id FK
        string order_number UK
        integer target_quantity
        string status
        date start_date
        date due_date
    }

    CUTTING_ORDERS {
        uuid id PK
        uuid tenant_id FK
        uuid production_order_id FK
        integer layers_count
        decimal fabric_length_used
        integer cut_pieces_count
        decimal actual_waste_percent
        string status
    }

    CUTTING_BUNDLES {
        uuid id PK
        uuid tenant_id FK
        uuid cutting_order_id FK
        string bundle_barcode UK
        integer bundle_quantity
        uuid size_id FK
        uuid color_id FK
    }

    STAGE_OPERATIONS_LOG {
        uuid id PK
        uuid tenant_id FK
        uuid bundle_id FK
        string stage_name
        uuid worker_id FK
        integer completed_quantity
        integer defect_quantity
        decimal piece_rate_applied
    }
```

---

## 5. مخطط أمانات خامات العملاء والقص للغير (Customer Materials & CMT)

```mermaid
erDiagram
    CUSTOMERS ||--o{ CUSTOMER_MATERIALS : deposits
    CUSTOMER_MATERIALS ||--o{ CUSTOMER_MATERIAL_RECEIPTS : logged_in
    CUSTOMER_MATERIALS ||--o{ JOB_ORDERS : supplied_for
    JOB_ORDERS ||--o{ JOB_DELIVERY_NOTES : fulfilled_by
    JOB_ORDERS ||--o{ JOB_INVOICES : billed_in

    CUSTOMER_MATERIALS {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        string fabric_name
        decimal received_meters
        decimal consumed_meters
        decimal remaining_meters
        string ownership_type
    }

    JOB_ORDERS {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        string service_type
        integer target_quantity
        decimal agreed_service_rate
        string status
    }
```

---

## 6. مخطط التكلفة الفعلية والقيود المحاسبية (Actual Costing & General Ledger)

```mermaid
erDiagram
    CHART_OF_ACCOUNTS ||--o{ JOURNAL_ENTRY_LINES : categorizes
    JOURNAL_ENTRIES ||--o{ JOURNAL_ENTRY_LINES : comprises
    PRODUCTION_ORDERS ||--o{ PRODUCTION_COST_SHEETS : accounts_for

    PRODUCTION_COST_SHEETS {
        uuid id PK
        uuid tenant_id FK
        uuid production_order_id FK
        decimal direct_material_cost
        decimal direct_labor_piece_rate
        decimal outsourced_work_cost
        decimal allocated_overhead
        decimal total_actual_cost
        decimal actual_cost_per_piece
    }

    JOURNAL_ENTRIES {
        uuid id PK
        uuid tenant_id FK
        string entry_number UK
        date entry_date
        string reference_type
        uuid reference_id
        boolean is_posted
    }

    JOURNAL_ENTRY_LINES {
        uuid id PK
        uuid entry_id FK
        uuid account_id FK
        decimal debit
        decimal credit
        string description
    }
```
