# GarmentOS Cloud — WOOC / Storefront Complete Functional Audit

**Repository:** `keroulsg/clothes`  
**Branch:** `main` (SHA: `f33589f`)  
**Audit Scope:** Public Storefronts, 4 Templates, Design Studio, ERP Commerce Integration, Wholesale, Payments  
**Auditor:** Senior E-Commerce Architect & Frontend QA Lead  

---

## 1. Storefront System Architecture

The WOOC (GarmentOS Web Out-of-the-box Commerce) system is built as an enterprise-grade multi-tenant e-commerce platform tightly integrated with factory ERP inventory.

```
                           +---------------------------+
                           |  Storefront Design Studio |
                           +-------------+-------------+
                                         | Draft / Publish
                                         v
+-----------------------+     +-------------------+     +-------------------------+
| Public Storefront View | <-> | Storefront Context| <-> | Storefront API Services |
+-----------+-----------+     +-------------------+     +------------+------------+
            |                                                        |
            |-- Fashion Boutique Template                            |-- Inventory Reservation
            |-- Modern Catalog Template                              |-- Server-Side Pricing
            |-- Kids & Family Template                               |-- ERP Sales Orders
            |-- Premium Brand Template                               |-- InstaPay Verification
                                                                     |-- Wholesale Approvals
```

---

## 2. The Four Distinct Storefront Templates

Each template is a distinct visual and structural implementation designed for a specific garment retail sector:

### 1. Fashion Boutique (`fashion_boutique`)
- **Aesthetic:** Editorial luxury, serif typography, high-fashion oversized hero visuals, fluid micro-interactions.
- **Components:** Curated lookbooks, seasonal drop banners, sticky variant selector, minimalist quick-buy drawer.
- **Responsive State:** Full viewport hero with touch-optimized thumbnail carousels on mobile ($390\times844$) and tablet ($768\times1024$).

### 2. Modern Catalog (`modern_catalog`)
- **Aesthetic:** Clean, utilitarian high-density grid designed for extensive wholesale and retail lines.
- **Components:** Left-rail faceted category filter, instant SKU search, bulk color/size pill selector, quick-add badges.
- **Responsive State:** Collapsible filter slide-out on mobile, responsive multi-column catalog grid.

### 3. Kids & Family (`kids_family`)
- **Aesthetic:** Vibrant, playful, friendly rounded cards, warm color accents, size-by-age helper chips (e.g. 2Y, 4Y, 6Y).
- **Components:** Age group navigation tabs, parent safety badges (100% Cotton, Hypoallergenic), multi-child bundles.
- **Responsive State:** Large touch targets ($48\text{px}+$), simplified single-column mobile checkout.

### 4. Premium Brand (`premium_brand`)
- **Aesthetic:** Monochromatic dark/light architectural minimalism, stark contrast, sharp modernist borders.
- **Components:** Full-width cinematic video/banner containers, technical fabric specifications, export-grade certificates.
- **Responsive State:** Responsive aspect ratios, high-DPI image srcset support.

---

## 3. Storefront Design Studio ("Elementor-Style" Customizer)

Located in the ERP dashboard under the Storefront tab, the Design Studio provides merchants complete no-code control over their e-commerce brand identity:

1. **Theme Selection & Switcher:** Instant preview and one-click active theme selection among the four templates.
2. **Branding & Visual Palette:** Primary, secondary, surface, background, and text color pickers with real-time CSS variable injection.
3. **Typography & Internationalization:** RTL (Arabic) / LTR (English) directional toggle, Cairo / Tajawal / IBM Plex Sans Arabic font selection.
4. **Hero & Promotional Banners:** Slide creation, image URL / Media Library selector, title, subtitle, CTA text, CTA destination links.
5. **Section Management & Reordering:** Move sections up/down, toggle visibility (Hero, Categories, Featured Products, New Arrivals, Sale Banners, Factory Trust Badges, Customer Reviews).
6. **Card Layout Controls:** Adjust product card borders, shadows, image aspect ratios, badges, and quick-add actions.
7. **Media Library:** Direct image uploads, copyable CDN links, thumbnail gallery.
8. **Draft & Publish Engine:**
   - Changes are maintained in draft state (`draft_theme_config`).
   - "Publish" persists configuration to `theme_config` with timestamp and actor tracking.
   - Live public storefront reflects changes instantly.

---

## 4. Public Customer Journey & UX Experience

- **Homepage & Catalog:** Hero banners, categorized ribbons, real-time product cards.
- **Product Details Page (PDP):**
  - High-resolution image galleries.
  - Interactive color and size matrix with live stock indicators.
  - Dynamic SKU and retail price display (server-validated).
  - Model specs, fabric composition (GSM, weave), washing guidelines, size guides.
- **Cart & Slideover Drawer:** Incremental quantity controls, subtotal computation, persistent local state.
- **Multi-Section Checkout:**
  - Customer name, phone, shipping address, city selection.
  - Server-calculated shipping fees based on zone.
  - Choice of Cash on Delivery (COD) or InstaPay.
  - Instant order placement creating both `StoreOrder` and ERP `SalesOrder`.
- **Order Confirmation & Tracking:**
  - Copyable order number and registered phone.
  - Direct WhatsApp button to confirm order with factory.
  - Public order tracker with status progress timeline.

---

## 5. Wholesale Engine ("Approval Required")

- **Gating Rule:** Wholesale pricing is strictly hidden from unapproved and guest users.
- **Application Flow:** Customers submit company name, tax ID, commercial register, and intended volume.
- **Admin Review:** Factory owner approves or rejects applications from the dashboard.
- **Tiered Pricing:** Once approved, customer sees negotiated volume tiers ($50-100\text{ pcs}$, $100+\text{ pcs}$) and minimum order quantity (MOQ) enforcement.

---

## 6. Payments & Order Lifecycle

- **Cash on Delivery (COD):** Places order in `new` status with `payment_status: 'pending'`.
- **InstaPay Integration:**
  - Merchant's factory InstaPay account handle is prominently displayed with a Copy button.
  - Customer enters transaction reference number and/or uploads receipt.
  - Order is placed in `pending_payment` or `pending_review`.
- **Admin Review Tab:** Dedicated table in dashboard displaying all pending InstaPay submissions with one-click approve/reject.
- **Sequential Shipping Actions:**
  $$\text{new} \xrightarrow{\text{Approve}} \text{confirmed} \xrightarrow{\text{Start Prod}} \text{preparing} \xrightarrow{\text{Ship}} \text{shipped} \xrightarrow{\text{Confirm Delivery}} \text{delivered}$$
- **One-Click WhatsApp Integration:** In the dashboard orders table, every order features a WhatsApp button pre-filling the customer's phone, order ID, amount, and direct tracking link (`/#/store/:tenant/track?order_number=...&customer_phone=...`).
