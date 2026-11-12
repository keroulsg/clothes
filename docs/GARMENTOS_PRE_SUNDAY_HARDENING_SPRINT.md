# GarmentOS Pre-Sunday Hardening Sprint

**Repository:** `keroulsg/clothes`  
**Base:** `main` at the branch point used to create `garmentos/pre-sunday-hardening`  
**Target review:** Sunday, 15 November 2026  
**Status:** In progress — no production deployment or database reset authorized.

## Accepted business decision: strict stock

The owner approved **Strict Stock**:
- Reject a sale, reservation, fulfillment, or stock-out when the physical on-hand quantity available to that operation is insufficient.
- Never fabricate inventory by incrementing `current_balance` in sales code.
- Never permit negative stock, including when a warehouse flag requests it.
- Available-to-promise quantity is on-hand less already reserved quantity.
- Keep reservation creation, fulfillment, cancellation, stock ledger entries, and reservation balances in one database transaction with row locks.
- Return a clear validation/domain error (HTTP 422 at API boundaries) containing available and requested quantities.
- No automatic stock creation as a substitute for a goods receipt or production completion.

## Execution rules

1. Work only on `garmentos/pre-sunday-hardening`; do not push fixes directly to `main`.
2. Preserve existing data and migration history. No destructive refactor, production SQL, database reset, or deployment.
3. Every schema change must be additive/backward-safe where possible and tested on PostgreSQL and SQLite; existing installations need an explicit upgrade path.
4. Make each coherent fix with regression tests. Do not mark an item fixed from static edits alone.
5. Do not hide accounting or persistence failures behind catch-and-continue behavior.
6. Keep the meeting/demo scope focused on the real end-to-end factory flow; clearly disclose any unverified or deferred feature.

## Priority order

### Gate 0 — baseline and schema compatibility
- Verify current branch head and CI state.
- Resolve UUID/BIGINT mismatch for `store_orders.payment_reviewed_by`.
- Resolve UUID actor fields for journal entries/payroll against the actual `users.id` type.
- Inspect `journal_entries.reference_id` and all callers before selecting a type that safely supports both legacy numeric IDs and UUID references.
- Run the complete migration suite against clean PostgreSQL and SQLite databases.

### Gate 1 — strict inventory integrity
- Remove all synthetic stock increments from reservation, fulfillment, and POS.
- Enforce available quantity = on-hand less reservations.
- Correct reservation aggregation to use the actual schema and authoritative reservation fields.
- Release reservations on fulfillment and cancellation without double-decrementing.
- Enforce strict non-negative stock in the inventory ledger, with a controlled path for consuming the current order's own reservation.
- Add tests for insufficient stock, concurrent reservations, fulfillment, cancellation, duplicate requests, and tenant isolation.

### Gate 2 — accounting and procurement integrity
- Fix inventory valuation to use the actual inventory schema and item types.
- Remove fabricated WIP parity; report WIP as unavailable/unreconciled until backed by actual WIP valuation.
- Ensure POS sales post complete, balanced GL entries for cash/receivable, revenue, VAT, discounts, and COGS/inventory as applicable.
- Fix account lookup fields and tax defaults using tenant configuration.
- Ensure supplier invoice posting creates a balanced, idempotent GL entry before marking the invoice posted/updating supplier balance.
- Ensure receipt/payment operations fail atomically if their GL posting fails.
- Verify manufacturing BOM variances and only post adjustments when supported by actual source values and configured accounts.

### Gate 3 — authorization and storefront
- Apply least-privilege role middleware to production completion, POS, sales payments, and related mutation routes.
- Enforce storefront enabled/payment configuration server-side.
- Resolve warehouse selection deterministically and within tenant scope.
- Add authorization and storefront regression tests.

### Gate 4 — frontend truthfulness and demo readiness
- Remove local-only success paths and fake stage progression.
- Fix Waslat Worsh download API prefix/token handling.
- Replace fabricated subscription/product variant fallbacks with explicit loading/error/empty states.
- Move bank loans to persistent API-backed storage only if the complete backend contract can be implemented and tested within scope; otherwise exclude the screen from the demo and report the limitation.
- Replace CSS-only QR artwork with a real QR payload/renderer or label it clearly as non-scannable.
- Build frontend and run relevant browser/API tests.

## Required evidence before calling the system ready

- PostgreSQL migration run: green.
- Backend test suite: green, with skipped tests listed and justified.
- Frontend production build: green.
- Strict stock tests: green, including concurrency and cancellation/fulfillment reservation accounting.
- Accounting tests: balanced journal entries and subledger/GL reconciliation.
- Role tests: unauthorized roles rejected and authorized roles accepted.
- End-to-end demo flow: purchase → receipt → inventory → production → finished goods → sale → payment → financial reports.
- Backup/restore and deployment configuration reviewed; no production deployment without explicit owner approval.

## Current status ledger

| Workstream | Status |
|---|---|
| Strict Stock decision | Approved |
| Isolated repair branch | Created |
| Source fixes | Not yet committed |
| Regression tests | Not yet run |
| PostgreSQL runtime verification | Pending |
| Production deployment | Not authorized |
