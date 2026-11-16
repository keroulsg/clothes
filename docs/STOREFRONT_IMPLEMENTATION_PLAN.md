# GarmentOS Cloud — Storefront Implementation Plan

**Repository:** `keroulsg/clothes`  
**Authorized Branch:** `garmentos/storefront-bom-development`  
**Target Completion Date:** November 14, 2026  
**Execution Methodology:** Strict Gated Phases with Continuous Verification  

---

## 1. Scope & Core Objectives

Transform the GarmentOS Cloud storefront and Storefront Design Studio into a comprehensive, multi-tenant e-commerce platform with:
1. Production-grade image/media upload infrastructure with batch uploads, metadata, drag-and-drop, and safe reference deletion.
2. Robust media rendering with universal fallback placeholders and port-decoupled URL resolution.
3. Four genuinely independent, premium template shopping journeys (Modern Catalog, Fashion Boutique, Kids & Family, Premium Brand).
4. Full dynamic Section Registry where template order strictly mirrors user-configured `themeConfig.sections`.
5. True interactive live preview canvas in Design Studio rendering actual templates on Desktop, Tablet, and Mobile.
6. Strict preservation of factory inventory rules (Policy: BLOCK on finished goods) and wholesale approval privacy.
7. Comprehensive automated testing and browser-based screenshot evidence.

---

## 2. Gate Schedule & Implementation Roadmap

| Gate | Focus Area | Technical Deliverables | Verification Criteria |
|---|---|---|---|
| **Gate 0** | Baseline & Audit | Create Baseline document and Deep Technical Audit | `STOREFRONT_IMPLEMENTATION_BASELINE.md` & `STOREFRONT_CURRENT_STATE_AUDIT.md` committed |
| **Gate 1** | Media Infrastructure | Add `upload-multiple`, SVG sanitization/restriction, dimension extraction, safe reference deletion check, frontend drag-and-drop batch upload | Unit tests for upload/delete; manual drag-drop test |
| **Gate 2** | Image Component & Fallbacks | Create `<StorefrontImage>` with loading state, error fallback, aspect ratios, object-fit | Verified broken URL handling without layout collapse |
| **Gate 3** | Dynamic Section Registry | Implement `StorefrontSectionRegistry` and render sections dynamically in all 4 templates according to `themeConfig.sections` | Reordering in Design Studio reflects immediately in storefront |
| **Gate 4** | Live Template Preview Canvas | Replace mockup in Design Studio with live responsive canvas mounting active template with draft config | Switching templates and colors updates preview in real time |
| **Gate 5** | Four-Template Specialization | Polish Modern Catalog (dense/B2B), Fashion Boutique (lookbook), Kids & Family (friendly/pill badges), Premium Brand (luxury/whitespace) | Screenshots demonstrating distinct UX/UI per template |
| **Gate 6** | Store Builder Polish | Banner editor, navigation editor, footer links, policy pages, card density controls | Saved draft, published live, verified rollback |
| **Gate 7** | Inventory & Security QA | Strict finished-goods stock validation, wholesale privacy tests, tenant scoping | 100% passing tests for negative & positive cases |
| **Gate 8** | Documentation & Visual Evidence | Generate all 9 required reports, capture high-res browser screenshots, compile final review package | Zero uncommitted files, clean production build |

---

## 3. Risk Mitigation & Safety Protocols

- **Branch Protection:** Work strictly on `garmentos/storefront-bom-development`. Never push or merge to `main`.
- **Database Safety:** No dropping tables, no truncating data, no destructive migrations.
- **Paymob Gateway:** Excluded from scope.
- **Service Continuity:** Keep backend API (`:8000`) and Vite frontend (`:5173`) running in host network mode so the user can interact freely at any time.
