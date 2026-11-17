# GarmentOS Cloud — Storefront Feature Gap Matrix

**Repository:** `keroulsg/clothes`  
**Branch:** `garmentos/storefront-bom-development`  
**Classification System:**
- **IMPLEMENTED:** Fully built, verified with tests, and functional.
- **IN_PROGRESS / INCOMPLETE:** Partially built; requires extension or refactoring to meet WooCommerce standards.
- **PLANNED:** Specified and scheduled for build during this execution sprint.
- **EXCLUDED:** Explicitly excluded by owner policy (e.g., Paymob).

---

## 1. Feature Classification Matrix

| Subsystem / Capability | Current Status | Current Implementation Evidence | Planned WooCommerce Transformation |
|---|---|---|---|
| **Commerce Architecture & Routing** | IN_PROGRESS | Modal/drawer based overlay in `PublicStorefrontView.tsx`. | Dedicated page routing: `'home' \| 'shop' \| 'category' \| 'product' \| 'cart' \| 'checkout' \| 'account' \| 'tracking' \| 'wholesale'`. |
| **Shared Commerce Engine** | IN_PROGRESS | Embedded inside `PublicStorefrontView.tsx` component state. | Abstract into reusable hook `useStorefrontCommerce` and shared UI components accessible by all templates. |
| **Dedicated Product Detail Page (PDP)** | IN_PROGRESS | Quick view modal with basic size/color chips and single image. | Full-featured PDP: multi-angle gallery with thumbnail switcher, lens zoom, color swatch picker, size grid with live stock indication, wholesale tier price matrix table, MOQ badge, fabric & care accordion, size guide, customer reviews, and related products carousel. |
| **Shop & Catalog Page** | IN_PROGRESS | Simple category pills and search input. | Dedicated Shop Catalog: Faceted sidebar filter (price range slider, category tree, size chips, color swatches, stock availability toggle), sorting options (price asc/desc, popularity, newest), and view layout switcher (grid vs list). |
| **Category Pages** | IN_PROGRESS | Filter query on main grid. | Dedicated Category Page view with banner description, breadcrumb navigation, subcategories pill row, and filtered catalog. |
| **Cart Experience** | IN_PROGRESS | Slide-over drawer with item increment/decrement. | Dual cart experience: Quick slide-out drawer + Dedicated `/cart` page with line item variant breakdown, real-time stock validation, wholesale MOQ indicators, subtotal calculations, coupon code entry, and shipping estimate. |
| **Multi-Section Checkout** | IN_PROGRESS | Single modal form with basic address inputs. | Multi-step / Multi-section Checkout: Step 1 (Contact info & Guest vs Wholesale login), Step 2 (Shipping address with Egyptian governorate/city dropdowns), Step 3 (Authoritative shipping calculation & method selection), Step 4 (Payment selection: COD vs verified InstaPay transfer), Step 5 (Order review and duplicate submission prevention lock). |
| **Customer Account Center** | IN_PROGRESS | Wholesale login/registration modal. | Unified Customer Portal: Profile management, saved shipping addresses, customer order history with real-time status badges and timeline tracking, wishlist management, and B2B wholesale trade status indicator. |
| **Order Tracking** | IMPLEMENTED | `PublicOrderTracker.tsx` lookup by order number and phone. | Integrate directly into store navigation and customer account center with detailed visual progress tracker. |
| **Theme 1: Modern Catalog** | IN_PROGRESS | `ModernCatalogTemplate.tsx` with basic grid. | High-density corporate & workwear catalog with quick-order table layout, bulk order inquiry CTA, downloadable size specs, and B2B wholesale pricing emphasis. |
| **Theme 2: Fashion Boutique** | IN_PROGRESS | `FashionBoutiqueTemplate.tsx` with hero banner. | Editorial lifestyle layout: large photography, curated lookbooks, seasonal collections, aesthetic serif headings, sticky add-to-cart, and Instagram aesthetic. |
| **Theme 3: Kids & Family** | IN_PROGRESS | `KidsFamilyTemplate.tsx` with pastel accents. | Warm, trustworthy family design: age bracket navigation (baby, toddler, kids, teen), hypoallergenic & certified organic cotton tags, visual size charts, and bundle & save prompts. |
| **Theme 4: Premium Brand** | IN_PROGRESS | `PremiumBrandTemplate.tsx` with dark accents. | Minimalist luxury layout: monochromatic palette, generous whitespace, bespoke craftsmanship stories, high-end lookbook gallery, and VIP concierge inquiry. |
| **Configurable Shipping Engine** | IN_PROGRESS | Hardcoded Egyptian governorate rules in `StorefrontService.php`. | Dynamic tenant-configured shipping zones, custom city rates, and customizable free-shipping threshold stored in `theme_config['shipping']` with fallback to governorate defaults. |
| **Payment Options** | IMPLEMENTED | COD & InstaPay receipt upload and verification in `StorefrontService.php`. | Maintain COD & InstaPay with enhanced UI, mobile payment guidance, InstaPay QR rendering, and receipt file upload validation. |
| **Payment Gateway: Paymob** | EXCLUDED | None. | Strictly excluded per owner mandate. |
| **Wholesale / B2B Experience** | IMPLEMENTED | `WholesaleService.php`, `WholesaleController.php`, `ProductVariantWholesaleTier`. | Seamless B2B experience: B2B registration, trade credentials validation, admin approval workflow, hidden wholesale prices for guests, server-authoritative tier pricing, and MOQ enforcement. |
| **Storefront Builder & Design Studio** | IMPLEMENTED | `StorefrontDesignStudio.tsx` with draft/publish/rollback. | Extend with custom navigation links, shipping rule configuration, announcement bar controls, and multi-device preview (desktop, tablet, mobile). |
| **Promotions & Coupons** | PLANNED | Basic discounts. | Server-authoritative coupon verification endpoint with percentage/fixed discount calculations and minimum spend criteria. |
| **Wishlist & Saved Items** | PLANNED | Local state in templates. | Persistent customer wishlist with quick-add to cart and shareable wishlist link. |
| **Product Reviews & Ratings** | PLANNED | None. | Structured product review list with star ratings, verified buyer badges, and submission modal. |
| **Factory ERP & BOM Stock Isolation** | IMPLEMENTED | `StorefrontService::placeStoreOrder` and `InventoryItem` balance checks. | Strict finished goods stock reservation (`current_balance - reserved_balance >= quantity`). Raw materials are never deducted by storefront sales. |
| **Order Lifecycle Transitions** | IMPLEMENTED | `StorefrontService::updateOrderStatus` with auto-replenishment on cancellation. | Strict status machine: `pending` -> `confirmed` -> `processing` -> `shipped` -> `delivered` (or `cancelled`). |

---

## 2. Immediate Action Plan

To close every identified gap without regression:
1. **Phase 1:** Build the unified `StorefrontCommerceContext` and state engine.
2. **Phase 2:** Implement dedicated view components: `ProductDetailView`, `ShopCatalogView`, `CategoryView`, `CartPageView`, `CheckoutView`, and `CustomerAccountView`.
3. **Phase 3:** Upgrade all four themes (`ModernCatalog`, `FashionBoutique`, `KidsFamily`, `PremiumBrand`) to leverage these views with distinct styling and brand layouts.
4. **Phase 4:** Connect dynamic shipping configuration and coupon engine.
5. **Phase 5-11:** Solidify B2B wholesale features, builder controls, inventory hooks, and accessibility.
6. **Phase 12-14:** Run full backend & frontend automated test suites, capture browser screenshots, and finalize acceptance reports.
