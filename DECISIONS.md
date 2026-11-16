# Architecture Decisions: Storefront, Wholesale, Retail & BOM Integration

## ADR-011: Strict Inventory Reservation & Finished Goods Separation
- **Context:** The storefront sells finished garments (ProductVariants). BOM represents raw materials (fabric, buttons, thread, trims).
- **Decision:**
  1. The storefront NEVER deducts raw materials when a finished product is sold.
  2. Public sellable inventory = physical balance in `finished_goods` warehouse MINUS active reservations (`reserved_balance`).
  3. Shortages STRICTLY BLOCK checkout; no automatic production orders or backorders.
  4. Checkout increments `reserved_balance` on the exact inventory item row. Physical deduction occurs upon ERP delivery/fulfillment.
  5. Pre-shipment cancellation releases the exact reservation on the specific inventory item row.

## ADR-012: Wholesale Account Authorization & Pricing Protection
- **Context:** Wholesale pricing and MOQ conditions must only be accessible to verified business customers.
- **Decision:**
  1. Wholesale pricing is NEVER returned in public catalog APIs, HTML, or unauthenticated responses.
  2. Wholesale customers authenticate via dedicated credentials; approval status is evaluated on every request.
  3. Pending, rejected, or suspended accounts are immediately blocked from wholesale pricing and checkout.
  4. Client-submitted prices are ignored; authoritative unit prices are computed server-side from active volume tiers.

## ADR-013: BOM Accessory Issuance & Fabric Double-Deduction Protection
- **Context:** Fabric is issued through the cutting order workflow (`executeCuttingOrder`). Other BOM items (trims, zippers, buttons) must be issued during production without re-deducting the fabric.
- **Decision:**
  1. Raw material requirements are calculated from approved BOM items multiplied by production order variant quantities.
  2. Fabric items (`component_type = 'fabric'` or items linked to cutting order) are excluded from generic accessory issuance.
  3. Accessories and trims are issued with a unique idempotency key (`BOM-ISSUE-{production_order_id}`) ensuring single issuance.
  4. Cancellation of a production order reverses accessory issuance and releases reservations.
