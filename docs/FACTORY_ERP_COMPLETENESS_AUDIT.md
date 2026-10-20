# GarmentOS Cloud — Factory ERP Completeness & Action-Driven UX Audit

**Date**: October 20, 2026  
**Auditor**: Principal SaaS Product Architect, Manufacturing ERP Specialist & QA Lead  
**Repository**: `https://github.com/keroulsg/clothes`  
**Brand Identity**: `#7F1625` (Royal Burgundy) | Direction: RTL / LTR | Themes: Light / Dark

---

## 1. Executive Summary & Inventory Overview

This audit establishes a rigorous page-by-page, action-by-action, and workflow-by-workflow inventory of the GarmentOS Cloud ERP. The audit evaluates whether factory owners, production managers, cutting supervisors, warehouse controllers, purchasing officers, accountants, sales reps, HR managers, quality inspectors, and maintenance technicians can complete real daily operations without encountering dummy state, missing endpoints, dead buttons, or disconnected workflows.

### Summary Statistics
- **Total Operational Pages / Tabs Audited**: 15
- **Total Modal & Action Interfaces Audited**: 22
- **Backend API Endpoints Available**: 56 endpoints across 14 controllers
- **Overall Operational Readiness**: High; core business workflows are connected to live database persistence. Specific action gaps (unconnected buttons, missing sidebar links, missing detail/BOM modals) are identified below for immediate remediation.

---

## 2. Complete Page & Feature Inventory

| Page / Route | Roles | Business Purpose | Data Displayed | Available Actions | Missing Actions & Gaps | Integration Status | Priority |
|---|---|---|---|---|---|---|---|
| **1. Factory Dashboard** (`#/erp/dashboard`) | Factory Owner, GM, Production Manager | Central command center for factory operations | Live production runs, fabric inventory, waste rate, piece-rate accruals, live shop-floor event stream, cutting efficiency metrics | Quick action dropdown (`ActionsMenu`): New model, new PO, fabric calc, stock movement, CMT intake, purchase order, bundle tracker, QC inspection | Table rows had multiple wide text buttons instead of clean contextual row action menus | `VERIFIED_FUNCTIONAL` | P1 |
| **2. Garment Models & BOM Catalog** (`#/erp/models`) | Tech Designer, Pattern Maker, Production Manager | Technical preparation, style codes, size/color variant matrices, barcodes, and BOM components | Model cards with code, category, season, target cost, wholesale & retail prices, variant count | Add new model with size/color matrix modal (`CreateModelModal`) | **Gap Found**: Button "بطاقة الباركود والـ BOM" lacked `onClick` action; page was missing from sidebar menu; no modal to view BOM or variant barcodes | `PARTIALLY_FUNCTIONAL` | P0 |
| **3. Cutting Floor & Production** (`#/erp/cutting`) | Cutting Supervisor, Floor Manager, QC Inspector | Manage production orders, lay plans, cutting orders, plies, bundle barcode tracking, and QC defect audits | Production orders table, cutting orders (table, plies, meters), bundle cards, QC inspection reports | New production order, fabric lay calculator, approve order, issue cutting order, bundle stage transfer, record QC inspection | Row actions were cluttered with multiple text buttons; missing contextual dropdown menu | `VERIFIED_FUNCTIONAL` | P1 |
| **4. Subcontracting & CMT** (`#/erp/subcontracting`) | Subcontracting Manager, CMT Coordinator, Accountant | Manage contract cutting and full CMT orders, customer material custody, outside processing (embroidery/printing), delivery notes, and service billing | Job orders, customer material receipts, external operations log, delivery notes, service invoices, job profitability | Create job order, intake customer fabric, dispatch/receive external operation, issue delivery note, generate invoice, record payment | Fully connected to live backend service endpoints | `VERIFIED_FUNCTIONAL` | P1 |
| **5. Fabric & Inventory Warehouses** (`#/erp/inventory`) | Warehouse Manager, Material Controller | Multi-warehouse stock tracking, fabric rolls/GSM, raw accessories, segregated customer CMT custody, immutable stock transaction ledger | Inventory items table with search and category filter, customer materials cards, immutable transaction ledger | Fabric weight/length calculator, record stock movement (goods receipt, material issuance, positive/negative adjustment, transfer in/out) | Stock transfer between two warehouses directly from item row | `VERIFIED_FUNCTIONAL` | P1 |
| **6. Procurement & Suppliers** (`#/erp/purchasing`) | Purchasing Officer, Accountant, Warehouse Receiver | Supplier records, purchase orders (PO), goods receipt inspection (GRN), and 3-way invoice matching | PO table with status badges, supplier list with balances, GRN inspection log, supplier invoices with matching status | Register supplier, create PO, approve PO, receive goods & inspect (GRN modal), 3-way match invoice modal | Print PO document slip, view PO line-item detail modal | `PARTIALLY_FUNCTIONAL` | P1 |
| **7. Sales, Deliveries & POS** (`#/erp/sales`) | Sales Rep, Wholesale Manager, Outlet Cashier | Commercial quotations, sales orders, inventory reservation, order fulfillment, delivery notes, and factory outlet POS | Sales orders table, quotations table, invoices list, delivery notes log, live POS catalog & checkout cart | Create quotation, create sales order, reserve inventory under row lock, fulfill & invoice, add to POS cart, complete POS cash checkout | Sales return initiation modal from invoice row | `PARTIALLY_FUNCTIONAL` | P1 |
| **8. Costing & Accounting** (`#/erp/costing`) | Financial Controller, Cost Accountant | Chart of accounts, double-entry balanced journal entries, cash/bank payment & receipt vouchers, production cost sheets | Accounts list with balances, journal entries with debit/credit breakdown, payment vouchers, production cost sheets | Post balanced journal entry, issue payment/receipt voucher with tenant account lock, calculate production order cost sheet | Print voucher slip, export journal entries | `VERIFIED_FUNCTIONAL` | P1 |
| **9. HR & Piece-Rate Payroll** (`#/erp/piece_rate`) | HR Officer, Production Clerk, Payroll Accountant | Employee register, operation-specific piece rates, daily piece-work logs by worker, and monthly payroll generation | Employees list, piece rates catalog, piece-work logs, generated payroll runs | Register employee, add piece rate per model operation, log worker production pieces, run monthly payroll calculation | Print worker pay slip | `VERIFIED_FUNCTIONAL` | P1 |
| **10. B2B Storefront ERP** (`#/erp/storefront`) | E-Commerce Manager, Customer Service | Manage customer wholesale/retail orders placed through the public tenant storefront | Storefront orders list, customer shipping address, line items, order totals, current status | Update order status (pending → confirmed → processing → shipped → delivered → cancelled) | View printable shipping label / packing slip | `VERIFIED_FUNCTIONAL` | P2 |
| **11. Machine Maintenance** (`#/erp/maintenance`) | Maintenance Engineer, Plant Technician | Asset register, preventive/corrective work orders, spare parts consumption, downtime tracking | Machine register, work orders table with priority badges, downtime summary KPI cards | Register machine, create work order, consume spare parts from inventory ledger under lock, complete work order with resolution notes | Preventive maintenance schedule calendar view | `VERIFIED_FUNCTIONAL` | P1 |
| **12. Tenant Configuration** (`#/erp/settings`) | Company Owner, Factory Admin | Company profile, industrial code, multi-branch & production site management | Company name, tenant code, primary branch, subscription status, branches list | Add new branch (factory, warehouse, outlet) with code and address | Edit branch details, manage user roles & permissions modal | `PARTIALLY_FUNCTIONAL` | P2 |
| **13. Platform Admin Dashboard** (`#/admin`) | Platform Super Administrator | Multi-tenant SaaS oversight, tenant subscription manual activation, custom domain DNS verification, central audit logs | Total factories count, active subscriptions, revenue metrics, tenants table, custom domains table, audit trail | Suspend tenant, activate subscription with auth code, change subdomain, set custom domain, verify DNS token, toggle domain status | Impersonate tenant admin safely for support | `VERIFIED_FUNCTIONAL` | P1 |
| **14. Public Marketing Website** (`#/`) | Prospective Factory Owners, Public Visitors | Showcase GarmentOS Cloud features, workflow stages, subscription pricing tiers, and contact inquiry | Feature highlights, workflow diagrams, plan comparison (Starter, Professional, Enterprise), interactive contact form | Open register modal with selected plan, submit contact inquiry (persisted to backend via `/api/v1/public/contact`), open login modal | Self-service password reset | `VERIFIED_FUNCTIONAL` | P2 |
| **15. Authentication & Onboarding** (Modals) | All Users | Secure login, tenant registration, and role-based redirect | Login modal with credentials, registration modal with plan selection and subdomain reservation | Submit credentials, register new factory tenant, token storage, logout with server revocation | Social OAuth (not required for factory ERP) | `VERIFIED_FUNCTIONAL` | P0 |

---

## 3. Confirmed Defects & Missing Controls Identified

1. **Missing Navigation Link**:
   - `models` tab exists in `App.tsx` but was completely omitted from `navGroups` in `AppLayout.tsx`. Users could only access it via a dashboard dropdown shortcut.
2. **Nonfunctional Button**:
   - In `App.tsx` (line 1954), the button "بطاقة الباركود والـ BOM" had no `onClick` handler and no associated modal or drawer.
3. **Missing BOM & Variant Details Interface**:
   - Backend has `/api/v1/boms` (index, store, approve), but frontend had no interface to view or add Bill of Materials components (fabric consumption, trims, waste tolerance) for a model.
4. **Cluttered Table Row Actions**:
   - In `productionOrders` and `purchaseOrders` tables, multiple wide text buttons were crowded into table cells. They must be refactored to use primary action buttons plus the consistent `ActionsMenu` dropdown.
5. **Missing PO Details & Print View**:
   - In Purchasing, users could approve or receive a PO, but could not open a clean modal to view the full line-item breakdown with prices and taxes.
6. **Missing Branch Navigation in Settings**:
   - Settings displayed branches but lacked a quick action menu for managing locations.

---

## 4. Prioritized Action Plan & Immediate Remediation

### Batch 1: High-Priority UX & Navigation Fixes (Immediate)
- [x] Add `models` (Models & BOM Catalog) to `AppLayout.tsx` sidebar navigation under "Production & Cutting".
- [x] Create `apps/web/src/components/catalog/ModelDetailsBomModal.tsx` to display variant SKUs, barcodes, and BOM components with live approval action.
- [x] Connect "بطاقة الباركود والـ BOM" in `App.tsx` to `ModelDetailsBomModal`.
- [x] Add `getBoms`, `createBom`, and `approveBom` methods to `apps/web/src/api/client.ts`.

### Batch 2: Action-Driven Table Controls & Contextual Menus
- [x] Refactor table row actions in `productionOrders`, `purchaseOrders`, and `cuttingOrders` to use the standardized `ActionsMenu` component.
- [x] Refactor `SalesTab` across Orders, Quotations, Invoices, and Delivery Notes with contextual `ActionsMenu` and added Sales Order Details Modal.
- [x] Refactor `AccountingTab` across Accounts, Journals, Vouchers, and Cost Sheets with `ActionsMenu` and live cost recalculation.
- [x] Refactor `HrTab` across Employees, Work Logs, and Payrolls with contextual `ActionsMenu` and Quick Log actions.
- [x] Refactor `MaintenanceTab` across Machines and Work Orders with `ActionsMenu` for spare parts issuance and asset QR printing.

### Batch 3: Verification & Reporting
- [x] Run backend test suite (`php artisan test`): **174/179 tests passed (100% of executable tests), 907 assertions, 0 failures** (5 PostgreSQL concurrency tests skipped due to lack of local PG 5432 daemon).
- [x] Run frontend build & type check (`tsc -b && vite build`): **Passed in 764ms with 0 errors**.
- [x] Update `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md` and `docs/PRODUCTION_READINESS_PLAN.md`.

