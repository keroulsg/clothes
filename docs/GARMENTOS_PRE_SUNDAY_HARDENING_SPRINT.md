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
| Strict Stock decision | Approved |\n| Synthetic stock increments in sales | Removed from reservation, POS, and delivery/fulfillment paths |\n| Reservation accounting | Added transactional release and mismatch guards; requires tests |\n| Inventory ledger negative-stock override | Disabled; requires regression tests |
| Isolated repair branch | Created |
| Strict-stock source changes | Committed to isolated branch; awaiting regression tests |
| Regression tests | Not yet run; required before merge |
| PostgreSQL runtime verification | Pending |
| Production deployment | Not authorized |


## Implementation notes — latest branch state

The following source changes have been committed to this isolated branch. They are **implementation progress, not a release sign-off**:

- Sales reservation/POS/delivery paths no longer fabricate positive stock. Reservation and fulfillment paths enforce on-hand/reserved quantities and use the inventory ledger.
- Manual stock OUT remains strict even if a warehouse's negative-stock flag is enabled.
- Storefront availability now reads the actual `current_balance` and `reserved_balance` fields from a deterministic finished-goods warehouse; the selected warehouse is captured by the catalog mapping closure.
- POS stock deduction is restricted to the same tenant-owned warehouse recorded on the invoice; it no longer silently falls back to a different warehouse.
- Customer receipts are created in the same database transaction as their balanced GL journal and invoice allocations.
- Supplier invoice posting writes the GL journal before marking the invoice posted and updating the supplier subledger.
- Chart-of-accounts re-seeding no longer resets existing account balances.
- Journal entries persist non-UUID references in `reference_key`; duplicate checks use that safe string key and only query the legacy UUID column for UUID-shaped references.
- The additive actor migration was rewritten to keep its up/down operations correctly separated and adds BIGINT user foreign keys for the affected journal, payroll, fiscal, transfer, and storefront reviewer fields. Payroll and storefront writes/models were updated to use the new fields.
- Production completion is now checked server-side against recorded completed quantity and completed cutting orders. The frontend uses the server response instead of inventing a completed quantity/date.
- Fake local-only bank-loan create/repayment is disabled; the screen now reports that the backend persistence contract is unavailable.
- Pricing no longer falls back to hardcoded plans/dates; fabricated production size/color variants were removed; dashboard fake OEE/scrap metrics and demo storefront slug were removed; receipt/bundle printouts no longer pretend static artwork is a scannable barcode/QR; Waslat attachment download returns the uploaded filename.
- Regression tests were added for preserving chart balances during re-seeding and storing numeric journal references.

### CI findings and follow-up fixes

The first PR workflow run (run 43242951273) exposed:
- PostgreSQL migration failure at `2026_11_03_000023` while adding the self-referencing `clothing_categories.parent_id` FK. The FK was moved to a separate schema operation after table creation; this change is awaiting a fresh PostgreSQL run.
- Frontend TypeScript unused-state errors in the disabled bank-loan screen and dashboard refresh indicators. The unused state/setters were removed; this change is awaiting a fresh build.

The next workflow run (43243446906) was started before those follow-up commits were present in its merge ref, so its failures do not validate the follow-up fixes. A new run against the latest PR head is required.

### Still not closed

- No PHP test suite, PostgreSQL migration run, frontend typecheck/build, browser test, or concurrency test has been executed in this environment. All of the above changes still require CI/runtime validation.
- The CI workflow currently runs on pushes to `main` and pull requests targeting `main`; Draft PR #1 is open to trigger CI; no workflow result is currently visible or claimed.
- Manufacturing cost variance posting remains intentionally unimplemented pending verification of the actual variance accounting policy and configured ledger accounts. The current chart of accounts does not establish the reported 5200/5300 account pair as valid posting targets; inventing those accounts or posting a second expense could double-count costs.
- The complete demo path and all remaining audit items still require targeted verification. Production remains unchanged and deployment is not authorized.


## Verified CI Gate — 2026-11-12 16:04 UTC

- Branch: `garmentos/pre-sunday-hardening`
- Verified commit: `319b017f48795ff91fe3e3e69e40acf92c39f7b9`
- GitHub Actions run: `43254443503`
- PostgreSQL migrations: PASS
- PostgreSQL concurrency integration tests: PASS
- Complete backend suite: PASS — 526 tests, 3,241 assertions
- Frontend TypeScript and Vite build: PASS
- This is CI evidence for the branch only. It does not authorize merge, production migration, deployment, or production data changes.
- Remaining audit disposition must be completed separately; a green CI run does not by itself prove every static-audit finding is closed. In particular, WIP inventory valuation remains explicitly incomplete in the reconciliation response and must not be represented as reconciled.


## Follow-up Verification — 2026-11-12 16:12 UTC

- Verified commit: `2004b78f0b0c0d28de8fc950271eea1410f4ed7d`
- GitHub Actions run: `43255867010`
- PostgreSQL migrations: PASS
- PostgreSQL concurrency integration tests: PASS
- Complete backend suite: PASS — 527 tests, 3,246 assertions
- Frontend TypeScript and Vite build: PASS
- Added a regression test proving AP reconciliation reports the supplier's actual subledger balance and exposes a mismatch with open invoices instead of masking it.
- Fixed employee-adjustment creator attribution to use the type-safe actor column.

---

## Follow-up Remediation — 2026-11-12

This section records additional source changes made after the preceding CI evidence. These changes are isolated to `garmentos/pre-sunday-hardening`; no production database, deployment, or `main` branch changes were made.

### Implemented

1. **Catalog truthfulness:** garment models created without an explicit season now persist `null`; the API no longer fabricates `صيف 2026`.
2. **Strict stock issue UI:** manual OUT validation now checks unreserved available quantity (`current_balance - reserved_quantity`) rather than the physical on-hand balance alone.
3. **Storefront cart aggregation:** repeated cart lines for the same variant are accumulated before stock validation, preventing individually-valid duplicate lines from reserving more than available stock.
4. **Storefront shipment execution:** moving a COD or verified InstaPay order to `shipped` executes the linked ERP sales order through `SalesService::fulfillOrder`, creating the sales invoice and consuming the reservation through the immutable inventory transaction ledger. Repeated status updates are idempotent; backward transitions and cancellation after shipment are rejected.
5. **Storefront status authorization:** status mutation is restricted to authorized tenant roles; InstaPay manual verification remains mandatory before shipment.
6. **SaaS quota enforcement:** tenant user creation, cutting-order creation, and the legacy `/sales-orders` alias now enforce the relevant quota/RBAC middleware. The active-user meter counts active users only.
7. **Regression coverage:** tests cover omitted garment seasons, duplicate cart-line over-reservation, inactive-user seat counting, and storefront shipment stock/invoice synchronization.

### Verification Evidence

- CI run `43259887846`, commit `b496fb57f8b8d1e2c1d22b7b9f393e862a6b2fe0`: **success**.
- Full backend suite: **531 passed, 0 failed, 3,267 assertions**.
- PostgreSQL concurrency integration: **5 passed, 22 assertions**.
- Frontend TypeScript and Vite production build: **success**.

### Remaining Production Gates — Not Claimed Complete

- WIP valuation still has no authoritative inventory subledger value; the reconciliation response intentionally remains `incomplete_wip_valuation`.
- FIFO inventory valuation is not implemented; current valuation uses weighted average cost.
- Live Paymob/Stripe credentials and end-to-end payment settlement remain external launch dependencies.
- Branch-level user access restrictions remain an owner policy decision and are not enabled.
- Production cloud backup/restore and disaster-recovery execution still require a verified target environment and restore drill.
- Inventory asset GL posting coverage for every manual adjustment and warehouse-transfer path requires a separate transaction-by-transaction accounting verification before claiming full financial close readiness.



### Follow-up Remediation — Inventory, WIP Cost Evidence, and Cost-Sheet Safety (2026-11-12)

- Stock-count approval PHP syntax was corrected. The resulting CI run on 192e73bd566614a2d0882f9bd39f56fd8bf0456e passed both backend and frontend jobs.
- Warehouse transfer dispatch and receipt now serialize on the transfer row, use stable per-line idempotency keys, preserve the transfer-time unit-cost snapshot, and return the committed transfer on safe replays. A lifecycle regression test covers duplicate dispatch and receipt.
- CI on c83f842a537112e5cf001be469ad62d5e5ace20f: PostgreSQL migrations and concurrency tests passed; full backend suite 532 passed; frontend TypeScript and Vite build passed.
- Cutting material issues are now recorded only after the cutting document exists, with reference_id, reference_number, actual weighted-average unit_cost, and an idempotency key. This repairs the broken link used by calculateProductionCost() to derive direct material cost for WIP.
- Cutting cancellation now reverses the original immutable issue quantity and original total_cost, not the item's potentially changed current average cost. Missing or mismatched original issue records block cancellation for manual reconciliation instead of fabricating a reversal.
- Manufacturing cost-sheet bulk calculation no longer force-recalculates approved sheets, excludes closed/cancelled orders, and reports failures rather than silently discarding them. Cost-sheet approval is serialized with a row lock and its audit record is in the same transaction.
- A PostgreSQL concurrency test was corrected to accept either valid race winner: a matched invoice may be posted (201), or a price-variance invoice may be held for review (202); the competing conflicting request must be 409. It verifies supplier balance and GL journal behavior for the actual winner.
- CI on eeb24f029a603235874d7d280f3fe7bf3aeffac6: PostgreSQL migrations and concurrency tests passed; full backend suite 532 passed, 3,297 assertions; frontend TypeScript and Vite build passed.

### Still Open — Not Production Sign-Off

- WIP remains not fully authoritative: approved/actual cost sheets are not yet tied into a complete WIP subledger and finished-goods capitalization flow for partial receipts. reconcileInventory() therefore continues to report incomplete_wip_valuation; do not interpret the known warehouse categories total as a full inventory valuation.
- Finished-goods capitalization currently requires a transaction-by-transaction review against approved cost sheets, partial QC receipts, and the actual inventory valuation method before it can be called reconciled.
- Manual inventory adjustment GL postings still need an approved gain/loss account policy and complete coverage tests. Intra-tenant warehouse transfers do not change total inventory value, but branch/accounting dimensions still need review.
- FIFO is not implemented; weighted-average cost remains the current method.
- Branch-level user access policy, external live payment credentials/settlement, and production backup/restore drill remain open dependencies.
- The above CI evidence applies to the exact commits listed, not to later commits until their own workflows complete.
