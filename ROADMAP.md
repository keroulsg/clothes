# ROADMAP: Storefront, Wholesale, Retail & BOM Integration

## Milestone 1: BOM & Production Inventory Flow (Phase 1)
- [ ] Calculate BOM material requirements per order variant breakdown (color/size).
- [ ] Reserve BOM raw materials on production order approval.
- [ ] Issue non-fabric BOM accessories exactly once, preventing double issuance of cutting fabric.
- [ ] Automated finished-goods receipt into finished goods warehouse upon production completion.
- [ ] Compensating transactions for order cancellation/reversal.
- [ ] Unit & Feature tests for shortages, idempotency, and tenant isolation.

## Milestone 2: Wholesale Customer Accounts (Phase 2)
- [ ] Wholesale customer application model, migration, and business profile capture.
- [ ] Admin review lifecycle: pending -> approved / rejected (with reason) / suspended.
- [ ] Independent customer authentication for storefront wholesale portal.
- [ ] Auditable, tenant-scoped decision logging.

## Milestone 3: Wholesale Pricing & MOQ (Phase 3)
- [ ] Quantity tier pricing table per variant (`product_variant_wholesale_tiers`).
- [ ] MOQ (Minimum Order Quantity) enforcement per variant/model.
- [ ] Authoritative server-side price calculation.
- [ ] Hide wholesale prices and tiers from public/unauthenticated endpoints.

## Milestone 4: Shopping Cart & Channel Checkout (Phase 4)
- [ ] Multi-channel checkout engine (`retail` vs `wholesale`).
- [ ] Server-side cart validation and atomic inventory reservation.
- [ ] Propagate channel classification to `SalesOrder`, `SalesInvoice`, and accounting.
- [ ] Prevent duplicate submissions via idempotency keys.

## Milestone 5: 4 Distinct Storefront Templates (Phase 5)
- [ ] Rebuild Fashion Boutique: Editorial layout, large hero, curated grid.
- [ ] Rebuild Modern Catalog: B2B dense catalog, sidebar filters, wholesale tier displays, MOQ badges.
- [ ] Rebuild Kids & Family: Warm colors, age brackets, cotton safety badges.
- [ ] Rebuild Premium Brand: Dark luxury minimalism, gold accents, formal collection showcase.
- [ ] Full bilingual support (Arabic RTL / English LTR) in Light and Dark modes.

## Milestone 6: Store Admin UI (Phase 6)
- [ ] Wholesale applications review and action panel.
- [ ] Wholesale tier and MOQ configuration interface.
- [ ] Order management and fulfillment actions.

## Milestone 7: Integration & Visual QA (Phase 7)
- [ ] Full automated test suite execution.
- [ ] TypeScript typecheck & production build.
- [ ] Visual QA across all 4 theme/language combinations.
- [ ] Final implementation and evidence report (`STOREFRONT_IMPLEMENTATION_REPORT.md`).
