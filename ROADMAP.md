# ROADMAP: Storefront, Wholesale, Retail & BOM Integration

## Milestone 1: BOM & Production Inventory Flow (Phase 1)
- [x] Calculate BOM material requirements per order variant breakdown (color/size).
- [x] Reserve BOM raw materials on production order approval.
- [x] Issue non-fabric BOM accessories exactly once, preventing double issuance of cutting fabric.
- [x] Automated finished-goods receipt into finished goods warehouse upon production completion.
- [x] Compensating transactions for order cancellation/reversal.
- [x] Unit & Feature tests for shortages, idempotency, and tenant isolation (`ProductionBomInventoryLifecycleTest.php`).

## Milestone 2: Wholesale Customer Accounts (Phase 2)
- [x] Wholesale customer application model, migration, and business profile capture (`WholesaleCustomerProfile`).
- [x] Admin review lifecycle: pending -> approved / rejected (with reason) / suspended / reactivated.
- [x] Independent customer authentication for storefront wholesale portal (`WholesaleService::login`).
- [x] Auditable, tenant-scoped decision logging.

## Milestone 3: Wholesale Pricing & MOQ (Phase 3)
- [x] Quantity tier pricing table per variant (`product_variant_wholesale_tiers`).
- [x] MOQ (Minimum Order Quantity) enforcement per variant/model.
- [x] Authoritative server-side price calculation (`WholesaleService::resolveAuthoritativePrice`).
- [x] Hide wholesale prices and tiers from public/unauthenticated/unapproved endpoints (`StorefrontService::getStoreDetails`).

## Milestone 4: Shopping Cart & Channel Checkout (Phase 4)
- [x] Multi-channel checkout engine (`retail` vs `wholesale`).
- [x] Server-side cart validation and atomic inventory reservation.
- [x] Propagate channel classification to `SalesOrder`, `SalesInvoice`, and accounting (`order_type = 'wholesale'`).
- [x] Prevent duplicate submissions via idempotency keys and row-level locking.

## Milestone 5: 4 Distinct Storefront Templates (Phase 5)
- [x] Rebuild Fashion Boutique: Editorial layout, large hero, curated grid, trade account portal trigger.
- [x] Rebuild Modern Catalog: B2B dense catalog, sidebar filters, wholesale tier displays, MOQ badges, bulk RFQ box.
- [x] Rebuild Kids & Family: Warm colors, age brackets, cotton safety badges, nursery wholesale link.
- [x] Rebuild Premium Brand: Dark luxury minimalism, gold accents, formal collection showcase, trade boutique inquiry.
- [x] Full bilingual support (Arabic RTL / English LTR) in Light and Dark modes.

## Milestone 6: Store Admin UI (Phase 6)
- [x] Wholesale applications review and action panel (`StorefrontTab.tsx` -> `wholesale_applications`).
- [x] Wholesale tier and MOQ configuration interface (`client.ts`, `WholesaleController`).
- [x] Order management and fulfillment actions with `wholesale` / `retail` channel tagging.

## Milestone 7: Integration & Visual QA (Phase 7)
- [x] Full automated test suite execution (571 tests, 3,494 assertions passing 100%).
- [x] TypeScript typecheck & production build (`tsc -b && vite build` passing 0 errors).
- [x] Final implementation and evidence report (`STOREFRONT_IMPLEMENTATION_REPORT.md`).
