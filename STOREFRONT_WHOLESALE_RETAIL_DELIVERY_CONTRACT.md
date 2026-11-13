# Storefront Wholesale + Retail Delivery Contract

Status: implementation in progress
Target branch: garmentos/storefront-bom-development
Production deployment: explicitly out of scope until owner approval
Main branch: do not modify or merge without explicit approval

## Owner-approved policies
- Stock policy: BLOCK. A storefront order is rejected when available finished-goods balance is lower than requested quantity. No automatic make-to-order or production order is created.
- Wholesale visibility: APPROVAL. Wholesale pricing and checkout are available only to a wholesale customer account approved by the tenant.
- Retail checkout remains available under the published retail price.
- The storefront sells finished ProductVariant stock only. It must never deduct BOM raw materials when a finished garment is sold.
- BOM materials are reserved/issued through production; completed production receipts add finished variants to finished-goods inventory.
- Checkout reserves finished goods. Shipment/fulfillment consumes the reservation through ERP sales workflow. Pre-shipment cancellation releases the exact reservation. Post-shipment returns use ERP return/credit-note workflow.

## Current verified baseline
- Public catalog is sourced from active finished-goods warehouse balances and subtracts reserved quantities.
- Checkout locks variants and inventory rows, aggregates repeated cart lines, validates available finished goods, creates ERP sales orders, and reserves inventory.
- ERP fulfillment consumes reserved quantity through the inventory ledger using an idempotency key.
- Retail and wholesale pricing were not previously separated safely: public catalog and checkout could fall back to wholesale_price. Current branch removes that fallback and hides public variants with no retail price.
- Cancellation previously searched inventory by variant without constraining the exact warehouse/inventory row. Current branch releases the exact inventory item referenced by the ERP sales-order line and refuses inconsistent reservation states.
- A complete wholesale account approval/authentication and tier-pricing workflow is not yet implemented.
- Four template IDs exist, but visual independence and quality have not yet been proven by visual QA.

## Required target behavior

### Inventory and manufacturing
1. BOM version is approved, active, tenant-owned, and bound to production order.
2. BOM requirements are calculated per model, color, size, unit of measure, and production quantity.
3. Raw materials are reserved at approved production commitment and issued once through inventory transactions.
4. Fabric consumed by cutting must not be issued again by generic BOM issue.
5. Completed production quantities are received as finished ProductVariant inventory in a finished-goods warehouse.
6. Public availability is on-hand minus reserved; never include raw materials or customer-owned stock.
7. Checkout rejects shortages atomically, including repeated lines and concurrent orders. No backorders or automatic production orders under BLOCK policy.
8. Fulfillment consumes reservation once. Pre-shipment cancellation releases the exact inventory row once. Post-shipment returns use ERP return workflow.

### Wholesale access and pricing
1. Wholesale application captures business identity/contact details and required verification identifiers.
2. New applications are pending and cannot access wholesale prices or checkout.
3. Tenant-authorized staff approve/reject applications; decisions are tenant-scoped and audited.
4. Wholesale accounts authenticate independently from tenant staff. Never trust submitted customer ID, phone, or sale_type without authenticated account context.
5. Retail prices remain public. Wholesale tiers are server-calculated by variant and quantity (min/max ranges), with explicit MOQ and deterministic tier selection.
6. Client-supplied unit prices are ignored. Missing tier, unmet MOQ, expired/revoked approval, or insufficient stock blocks checkout.
7. ERP SalesOrder order_type/customer linkage reflects actual sale channel and customer class.

### Storefront experience
- Four materially distinct responsive storefront designs, not palette-only variations.
- Product listing/detail, category navigation, search/filter/sort, color/size selection, stock availability, gallery, cart, checkout, tracking, customer account, wholesale application/approval state, and wholesale tier display.
- RTL Arabic and LTR English; mobile-first layout; accessible states and keyboard behavior.
- Design studio draft/preview/publish/rollback remains isolated from live storefront until publish.
- Store admin: products, categories, media, banners, retail prices, wholesale tiers/MOQ, customer applications, orders, shipping/payment settings, SEO, analytics.

## Delivery gates
1. Read-only audit of existing schema, routes, permissions, frontend templates, and tests.
2. Inventory lifecycle hardening and automated tests: shortage, duplicate lines, concurrent reservation, fulfillment idempotency, cancellation idempotency, wrong warehouse, tenant isolation.
3. Wholesale application, independent authentication, approval/rejection, audit trail, and permission tests.
4. Wholesale tier pricing, MOQ, server-authoritative checkout pricing, and retail/wholesale ERP order classification tests.
5. Storefront customer UX and order-management UI.
6. Rebuild four templates as genuinely distinct layouts and run Arabic RTL/English LTR visual QA in light/dark modes.
7. Full integration QA and evidence report. No production-ready claim until all gates pass.

## Non-negotiable safety rules
- Never change main, merge, deploy, or modify production data without explicit owner approval.
- Never run destructive migrations, database resets, or production tests.
- No fake payment success, mock stock, negative stock, or silent fallback to wholesale price.
- Every write must be tenant-scoped and protected by the relevant role/permission.
- Report code changes, test execution, CI status, and visual QA separately.