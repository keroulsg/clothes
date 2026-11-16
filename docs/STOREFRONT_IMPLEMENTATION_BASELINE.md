# GarmentOS Cloud — Storefront Implementation Baseline

**Repository:** `keroulsg/clothes`  
**Authorized Branch:** `garmentos/storefront-bom-development`  
**Base Commit SHA:** `8a13f44f285e0d3e8101811aada96af1b4197666`  
**Date/Time:** 2026-11-14T15:47:00+02:00  
**Working Tree Status:** Clean  

---

## 1. Environment & Live Daemons

The application is actively running and accessible directly from the host browser:

- **Laravel Backend API:** `http://127.0.0.1:8000` (PHP 8.4.24 Built-in Server running on host network)
- **Vite Web Frontend:** `http://127.0.0.1:5173` (Vite v8.3.4 running on host network)
- **Test Tenant ID:** `01a14f55-ecd1-7056-98aa-fa5dd1aa9a3a` (مصنع الدلتا للملابس الجاهزة)
- **Storefront Slug:** `msnaa-aldlta-llmlabs-algahz-429`

### Direct Access URLs
- **Live Public Storefront:** [http://127.0.0.1:5173/#/store/01a14f55-ecd1-7056-98aa-fa5dd1aa9a3a](http://127.0.0.1:5173/#/store/01a14f55-ecd1-7056-98aa-fa5dd1aa9a3a)
- **Storefront Design Studio (ERP):** [http://127.0.0.1:5173/?audit_auth=1#/erp/storefront](http://127.0.0.1:5173/?audit_auth=1#/erp/storefront)
- **Direct Login Credentials:** `owner@delta-garments.test` / `password`

---

## 2. Safety Rules Acknowledgment

1. Work exclusively on `garmentos/storefront-bom-development`.
2. Do NOT touch, rebase, or push to `main`.
3. Do NOT deploy to production.
4. No destructive database commands (no `migrate:fresh`, `truncate`, or data deletion).
5. Exclude Paymob payment gateway from scope.
6. Preserve existing tenant isolation, BOM reservations, and finished-goods stock policies.

---

## 3. Pre-existing Verified State

- **Backend Tests:** 77 tests passed, 438 assertions (`php artisan test --filter=Storefront`).
- **Frontend Build:** Succeeded (`tsc -b && vite build`) with zero type errors.
- **Hero CTA Button:** Converted from `<a href="#products">` to programmatic navigation (`handleHeroCtaClick`), preventing hash-router hijacking to the landing page.
- **Media URL Normalization:** `api.getMediaUrl(...)` integrated across templates, Cart Drawer, Cart Page, Shop Page, Detail Page, and Category Page.
- **Design Studio:** Save & Publish Live button, Promotional Banners editor, and Store Logo editor established.
