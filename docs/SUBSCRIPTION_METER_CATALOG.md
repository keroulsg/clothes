# GarmentOS Cloud — Subscription Meter & Entitlement Catalog

**Date:** October 31, 2026  
**Status:** Authoritative Meter Specifications  
**Scope:** Factory Resource Constraints, Volume Dimensions, and Business Overage Policies

---

## 1. Global Meter Definitions

| Meter ID | Key | Name (Arabic) | Name (English) | Unit | Aggregation | Limit Type | Overage Policy | Default Starter | Default Pro | Default Enterprise |
|:---:|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **MTR-01** | `active_users` | عدد المستخدمين | Active Users | seats | Max Count | Hard Limit | Block creation; invite purchase | 3 seats | 10 seats | Unlimited (999) |
| **MTR-02** | `active_branches` | الفروع والمعارض | Active Branches | locations | Max Count | Hard Limit | Block creation | 1 location | 3 locations | 20 locations |
| **MTR-03** | `active_warehouses`| المستودعات والمخازن | Active Warehouses | warehouses | Max Count | Hard Limit | Block creation | 1 warehouse | 3 warehouses | 50 warehouses |
| **MTR-04** | `active_employees` | سجلات العمال والموظفين | Active Employees | workers | Max Count | Hard Limit | Block creation; upgrade prompt | 25 workers | 100 workers | 1,000 workers |
| **MTR-05** | `garment_models` | الموديلات والتصميمات | Garment Models | styles | Max Count | Hard Limit | Block creation | 20 styles | 100 styles | 1,000 styles |
| **MTR-06** | `production_orders`| أوامر التشغيل الشهرية | Monthly Production Orders | orders | Monthly Sum | Soft Limit | Warn at 85%; Allow completion | 30 orders | 150 orders | 1,500 orders |
| **MTR-07** | `cutting_lays` | فرشات صالة القص | Monthly Cutting Lays | lays | Monthly Sum | Soft Limit | Never block active lay | 50 lays | 300 lays | 3,000 lays |
| **MTR-08** | `purchase_orders` | أوامر الشراء الشهرية | Monthly Purchase Orders | orders | Monthly Sum | Hard Limit | Block draft PO creation | 20 orders | 100 orders | 1,000 orders |
| **MTR-09** | `sales_orders` | أوامر وفواتير البيع | Monthly Sales Orders | orders | Monthly Sum | Soft Limit | Overage billable per order | 50 orders | 250 orders | Unlimited |
| **MTR-10** | `subcontract_jobs`| عقود التشغيل للغير | Monthly Subcontract Jobs | jobs | Monthly Sum | Hard Limit | Block creation; upgrade prompt | 5 jobs | 30 jobs | 300 jobs |
| **MTR-11** | `storage_megabytes`| سعة تخزين المستندات | Storage Consumption | MB | Current Size | Soft Limit | 500 MB quota notification | 500 MB | 5,000 MB | 50,000 MB |
| **MTR-12** | `marketplace_bids` | عروض منصة وصلة ورش | Waslat Worsh RFQs & Bids | bids | Monthly Sum | Hard Limit | Block submission | 3 bids | 20 bids | Unlimited |

---

## 2. Business Quota Exceptions & Safe Operation Rules

To prevent business disruption during mission-critical manufacturing operations:
1. **Cutting Floor Immunity:** If an authorized cutting order has been issued, cutting operations, fabric deductions, and lay adjustments are **exempt from mid-operation blocks**, even if the tenant reaches 100% of their monthly cutting lays quota.
2. **Payroll Generation Immunity:** A factory accountant can always generate, approve, and finalize a monthly payroll for existing active employees, regardless of storage or transaction counters.
3. **Emergency Admin Overrides:** Factory managers facing quota blocks can request a 7-day temporary emergency override (`subscription_quota_overrides`) granted by platform admins, allowing operations to proceed unhindered while procurement approves a plan upgrade.
4. **Historical Read-Only Access:** If a factory subscription expires or downgrades, all historical orders, invoices, BOMs, and payroll records remain 100% accessible in read-only mode.

