# GarmentOS Cloud — Storefront Template Redesign Report

## 1. Overview

GarmentOS Cloud provides four distinct, fully-realized storefront design templates. Each template caters to a specific market segment and brand positioning, while sharing a common underlying architecture and dynamic section registry.

## 2. Template Architecture & Dynamic Section Registry

All templates integrate with `apps/web/src/components/storefront/common/StorefrontSectionRegistry.tsx` via `getActiveSortedSections()`. This architecture decouples the visual presentation layer from the layout sequence, enabling tenant owners to enable, disable, and reorder homepage sections in real-time from the ERP Design Studio.

### Supported Dynamic Section Types:
1. `hero_banner`: Full-width or split hero showcase with desktop/mobile responsive image support.
2. `categories`: Visual category navigator (circle badges, masonry grid, or playful chips).
3. `featured_products`: Curated collection of highlighted finished apparel items.
4. `new_arrivals`: Latest factory releases with "New / جديد" badges.
5. `promo_banners`: 2-column or 3-column promotional and seasonal deal banners.
6. `wholesale_cta`: Call-to-action block highlighting B2B tier pricing, MOQ tiers, and tax invoice compliance.
7. `trust_badges`: Customer assurance indicators (Fast Shipping, Premium Quality, Secure Payment, Easy Returns).
8. `newsletter`: Customer email subscription box for marketing broadcasts.

---

## 3. Four Distinct Template Identities

### A. Fashion Boutique (`fashion_boutique`)
- **Target Audience**: Women's apparel, high-fashion brands, couture, curated seasonal drops.
- **Design Language**: Minimalist luxury, high white space, subtle serif accents (`font-serif`), refined letter-spacing.
- **Aspect Ratio**: Elegant 3:4 portrait product cards.
- **Micro-Interactions**: Smooth image zoom on hover, floating wishlist heart, quick-add drawer.

### B. Modern Catalog (`modern_catalog`)
- **Target Audience**: Large-volume factory direct outlets, general apparel, wholesale-retail hybrid stores.
- **Design Language**: Dense, high-efficiency grid layout, prominent category pills, high-contrast CTA buttons.
- **Aspect Ratio**: 1:1 square product photography.
- **Micro-Interactions**: Direct add-to-cart buttons, stock counter pills, immediate variant selection.

### C. Kids & Family (`kids_family`)
- **Target Audience**: Children's clothing, school uniforms, casual family wear.
- **Design Language**: Warm, cheerful, rounded cards (`rounded-3xl`, `rounded-2xl`), playful color badges, soft shadows.
- **Aspect Ratio**: Square product images with soft corner radiuses.
- **Micro-Interactions**: Bouncy hover transitions, colorful category badges, safety assurance icons.

### D. Premium Brand (`premium_brand`)
- **Target Audience**: Premium menswear, outerwear, bespoke factory collections, luxury streetwear.
- **Design Language**: Dark, moody aesthetic (slate-950 and zinc-900 background), gold/amber or emerald accent styling, editorial typography.
- **Aspect Ratio**: Cinematic wide and 3:4 portrait cards.
- **Micro-Interactions**: Subtle border glow on hover, embossed metal badges, exclusive VIP wholesale indicators.

---

## 4. Visual Evidence & Responsive Integrity

- **Desktop Viewport (1440x900)**: Clean multi-column grids (4 columns for Modern Catalog and Kids & Family, 3 columns for Fashion Boutique and Premium Brand).
- **Tablet Viewport (768x1024)**: Responsive 2-column adaptive grid with touch-friendly targets.
- **Mobile Viewport (375x812 / 390x844)**: Single-column or 2-column compact grid, sticky mobile navigation bar, swipeable category chips.
- **Image Error Handling**: Every product card uses `<StorefrontImage>` ensuring zero broken image icons or collapsed card dimensions across all 4 templates.
