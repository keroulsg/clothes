# GarmentOS Cloud — Storefront & E-Commerce Deep Technical Audit

**Repository:** `keroulsg/clothes`  
**Authorized Working Branch:** `garmentos/storefront-bom-development`  
**Baseline Commit SHA:** `8a13f44f285e0d3e8101811aada96af1b4197666`  
**Audit Date:** November 14, 2026  
**Auditor Roles:** Principal Software Architect, Senior Laravel/React Engineer, Application Security Lead, QA Lead  

---

## 1. Executive Summary & Verification Methodology

A thorough, multi-layered code inspection and runtime audit was conducted across the backend and frontend components of the GarmentOS Cloud multi-tenant storefront subsystem. 

### Runtime & Service State
- **Laravel API Server:** Running on `http://127.0.0.1:8000` (PHP 8.4.24, host network bypass).
- **Vite Web Server:** Running on `http://127.0.0.1:5173` (Vite 8.3.4, host network bypass).
- **Automated Tests:** 77 Storefront-specific tests passing (438 assertions), 571 total backend tests passing.
- **Frontend Compilation:** `tsc -b && vite build` completes cleanly with zero diagnostic errors.
- **Git State:** 100% clean on `garmentos/storefront-bom-development`. `main` remains untouched.

---

## 2. In-Depth Defect & Architecture Audit

### Defect Area A: Image & Media Management

#### Finding A.1: Media Upload Endpoint & File Validation Strategy
- **File & Location:** `apps/api/app/Http/Controllers/Api/StorefrontController.php:655-700` (`uploadMedia`)
- **Actual Behavior:** 
  The single-file upload endpoint validates: `'file' => 'required_without:image|file|image|mimes:jpeg,png,jpg,webp,svg,gif|max:5120'`.
  SVGs and GIFs are allowed without server-side XML/SVG sanitization or dimension checks. Multiple image upload (`/upload-multiple`) does not exist.
- **Root Cause:** Initial implementation prioritized basic image upload; lacks multi-file batch upload and strict SVG sanitization.
- **Business Impact:** SVG uploads introduce Stored XSS vulnerability risks; lack of multi-file upload slows down store catalog setup.
- **Severity:** **HIGH (Security & Usability)**
- **Required Repair:**
  1. Restrict permitted MIME types strictly to `jpeg, png, webp, jpg`. If SVG is ever accepted, it must pass through an XML sanitizer.
  2. Implement `POST /api/v1/storefront/media/upload-multiple` supporting batch uploads with individual error isolation.
  3. Add server-side dimension extraction (`getimagesize()`) storing width, height, aspect ratio, and human-readable size.
- **Test Needed:** Unit test uploading malicious SVG (must be rejected with 422), uploading multi-file batch (returns 201 with array of media items), and inspecting extracted metadata.

#### Finding A.2: Media Deletion Safety & Reference Checks
- **File & Location:** `apps/api/app/Http/Controllers/Api/StorefrontController.php:719-754` (`deleteMedia`)
- **Actual Behavior:** Deletes any media path starting with `storefront/{tenant_id}/` immediately from disk and JSON array without verifying if the media item is actively referenced in `branding.logo_url`, `hero_banner.desktop_image`, `hero_banner.mobile_image`, or `promo_banners`.
- **Root Cause:** Deletion logic only checks tenant boundary (`str_starts_with`), not schema/theme usage.
- **Business Impact:** Store owner or manager deleting an image from the library breaks live storefront hero banners or logos.
- **Severity:** **MEDIUM**
- **Required Repair:** Implement active reference detection. If the file is referenced in `theme_config` or `draft_theme_config`, return a 422 error or warning requiring explicit force confirmation or replacement.
- **Test Needed:** Test deleting an image currently set as `hero_banner.desktop_image` (verify rejection with `MediaInUse` error).

#### Finding A.3: Media URL Resolution & Port Decoupling
- **File & Location:** 
  - `apps/web/src/api/client.ts` (`getMediaUrl`)
  - `apps/web/src/components/storefront/views/*.tsx`
- **Actual Behavior:** `getMediaUrl` was recently introduced and integrated into views. However, if an image fails to load (404 or network issue), some templates and product card components do not display a unified SVG fallback placeholder, causing broken image icons or collapsed layout cards.
- **Root Cause:** Native `<img>` tags lack an `onError` fallback handler that replaces the broken source with a standardized inline SVG placeholder.
- **Business Impact:** Inconsistent or missing product images degrade consumer confidence and look unprofessional.
- **Severity:** **MEDIUM**
- **Required Repair:** Create a universal `<StorefrontImage>` component with built-in loading skeleton, error fallback placeholder, aspect-ratio container, and object-fit options.
- **Test Needed:** Render `<StorefrontImage src="/non-existent.jpg" />` in browser test and verify the fallback placeholder is displayed and card dimensions remain stable.

---

### Defect Area B: Design Studio & Configuration Persistence

#### Finding B.1: Homepage Section Dynamic Rendering Mismatch
- **File & Location:** 
  - `apps/web/src/components/storefront/StorefrontDesignStudio.tsx:1062-1136` (Tab 3: Sections)
  - `apps/web/src/components/storefront/templates/*.tsx`
- **Actual Behavior:** Design Studio provides UI to reorder, enable, or disable homepage sections (`hero`, `categories`, `featured_products`, `promotions`, `story`). However, the four storefront templates hardcode the visual section order in JSX and ignore `themeConfig.sections`.
- **Root Cause:** Section management UI was designed independently without a shared dynamic section registry and rendering loop in the templates.
- **Business Impact:** The store owner changes section order or hides promotions in Design Studio, saves and publishes, but the public storefront never updates the section layout.
- **Severity:** **HIGH**
- **Required Repair:**
  1. Build a unified Section Registry mapping section IDs (`hero`, `categories`, `featured_products`, `promo_banners`, `about_story`, `custom_content`, `newsletter`, `contact_info`) to template-specific renderer functions.
  2. In all four templates, iterate over `themeConfig.sections.filter(s => s.enabled)` and render sections in the user's defined sequence.
  3. Provide fallback to default section order if `sections` array is missing or empty.
- **Test Needed:** Reorder sections so `promo_banners` appears before `categories`, save, publish, and verify public storefront DOM order matches the saved sequence.

#### Finding B.2: Design Studio Preview Was a Miniature Static Mockup
- **File & Location:** `apps/web/src/components/storefront/StorefrontDesignStudio.tsx:1720-1834`
- **Actual Behavior:** The right-hand preview panel renders a miniature simulated card mockup (`<div className="p-3 text-[10px] space-y-3">...`) with hardcoded dummy items, rather than mounting the actual selected template component with draft theme configuration and real tenant products.
- **Root Cause:** The preview container was built as a lightweight CSS mockup to avoid loading the full template state.
- **Business Impact:** The store owner cannot see what their chosen template, colors, banners, and typography actually look like on Desktop, Tablet, and Mobile without opening a separate tab.
- **Severity:** **HIGH**
- **Required Repair:** Render the actual template (`FashionBoutiqueTemplate`, `ModernCatalogTemplate`, `KidsFamilyTemplate`, `PremiumBrandTemplate`) inside the responsive preview frame using the current live draft configuration and real tenant catalog models.
- **Test Needed:** Select `KidsFamilyTemplate`, change primary color, verify the preview frame immediately displays the actual Kids & Family template in real time.

#### Finding B.3: Content Pages & Policies Storage Contract
- **File & Location:** `apps/web/src/components/storefront/StorefrontDesignStudio.tsx:1280-1420` (Tab 6: Content & Pages)
- **Actual Behavior:** The editor allows editing About Us and Contact info, but lacks dedicated rich content editors for standard e-commerce policies: Shipping Policy, Return & Exchange Policy, Privacy Policy, and Terms of Service.
- **Root Cause:** Incomplete policy schema in `theme_config.pages`.
- **Business Impact:** Public storefront policy links in the footer either open empty views or generic text.
- **Severity:** **MEDIUM**
- **Required Repair:** Expand `theme_config.pages` to include `policies: { shipping: string, returns: string, privacy: string, terms: string }` with sanitized Markdown/HTML rendering in both the Studio and the public views.
- **Test Needed:** Save custom Return Policy text, visit `/#/store/{tenant}/policies?tab=returns`, and verify text renders correctly.

---

### Defect Area C: Four Independent Template Experiences

#### Finding C.1: Template Visual & Functional Differentiation
- **File & Location:** `apps/web/src/components/storefront/templates/`
- **Actual Behavior:** 
  The 4 templates currently share very similar product grid cards and filter toolbars, differing primarily in accent colors and hero banner styles.
- **Root Cause:** Initial implementation created variations on a common layout rather than genuinely distinct archetypes.
- **Business Impact:** High-end boutique buyers, bulk wholesale buyers, and children's apparel shoppers receive nearly identical user experiences.
- **Severity:** **HIGH**
- **Required Repair:**
  1. **Modern Catalog:** Dense, high-information B2B/B2C grid, SKU display, stock level badges, compact cards, rapid add-to-cart, column density switcher (3, 4, 5 columns).
  2. **Fashion Boutique:** Editorial lookbook styling, large aspect-ratio images (3:4), hover secondary image preview, elegant serif/sans typography, seasonal collection carousel.
  3. **Kids & Family:** Friendly visual language, rounded elements, age/size pill badges, soft pastel accents, clear safety/material tags.
  4. **Premium Brand:** Minimalist luxury aesthetic, generous whitespace, subtle gold/bronze accents, understated typography, high-impact brand storytelling.
- **Test Needed:** Render all 4 templates with identical product data; capture screenshots proving distinct DOM layout, card density, typography, and interactive components.

#### Finding C.2: Product Card Density and Customization Controls
- **File & Location:** `apps/web/src/components/storefront/StorefrontDesignStudio.tsx` & templates
- **Actual Behavior:** Product card density (compact vs normal vs spacious), image aspect ratio (square vs portrait), and visibility toggles (show/hide SKU, show/hide stock badge, show/hide rating) are not fully exposed in Design Studio or wired into the templates.
- **Root Cause:** Card rendering props were hardcoded within each template.
- **Business Impact:** Store owner has no control over catalog density or information display.
- **Severity:** **MEDIUM**
- **Required Repair:** Add `theme_config.catalog: { card_density, aspect_ratio, show_sku, show_stock_badge, show_quick_view }` and bind to product card components.
- **Test Needed:** Change `card_density` to `compact` in Design Studio; verify public storefront renders tighter cards with smaller padding and visible SKU.

---

### Defect Area D: Inventory, Security & Tenant Isolation

#### Finding D.1: Strict Inventory Enforcement on Storefront Checkout
- **File & Location:** `apps/api/app/Services/StorefrontService.php:490-580` (`placeStoreOrder`)
- **Status:** **VERIFIED & SECURE (Policy: BLOCK)**
- **Audit Detail:**
  - Queries `inventory_items` with `lockForUpdate()`.
  - Verifies `available_balance = current_balance - reserved_balance >= quantity`.
  - Atomically reserves finished-goods inventory (`reserved_balance += quantity`).
  - Rejects order with 422 if stock is insufficient.
  - On cancellation (`updateStatus` -> `cancelled`), automatically releases reservation (`restoreOrderInventory`).
  - Raw material BOM components are never exposed as finished goods.

#### Finding D.2: Wholesale Pricing Protection
- **File & Location:** `apps/api/app/Services/WholesaleService.php` & `StorefrontService.php:80-140`
- **Status:** **VERIFIED & SECURE (Policy: APPROVAL)**
- **Audit Detail:**
  - Wholesale pricing tiers (`product_variant_wholesale_tiers`) are strictly restricted.
  - Anonymous visitors and unapproved B2C customers only receive retail pricing.
  - Wholesale profile approval requires tenant admin action (`approveApplication`).
  - Unauthenticated requests cannot read wholesale discount schedules or MOQs.

---

## 3. Prioritized Action Plan & Implementation Gates

1. **Gate 1: Media Infrastructure:**
   - Multi-file upload endpoint (`/storefront/media/upload-multiple`).
   - SVG restriction & metadata extraction.
   - Safe reference deletion guard.
   - Frontend drag-and-drop batch uploader in Design Studio.
2. **Gate 2: Universal Image Component & Fallbacks:**
   - Standardized `<StorefrontImage>` with skeleton loading & fallback SVG.
3. **Gate 3: Dynamic Section Registry & Rendering:**
   - Shared Section Registry rendering `themeConfig.sections` dynamically in all 4 templates.
4. **Gate 4: Real Live Template Preview Canvas:**
   - Interactive preview frame mounting the actual selected template with live draft config.
5. **Gate 5: Four-Template Visual & Functional Specialization:**
   - Modern Catalog (dense, SKU, quick-add).
   - Fashion Boutique (editorial, hover-zoom, lookbook).
   - Kids & Family (pill badges, playful typography, age filters).
   - Premium Brand (minimalist luxury, restrained palette, generous whitespace).
6. **Gate 6: Comprehensive Documentation, Tests & Visual Evidence:**
   - Update all required reports.
   - Run full PHPUnit suite and frontend build.
   - Capture real browser screenshots of all 4 templates, Design Studio, and Media Library.
