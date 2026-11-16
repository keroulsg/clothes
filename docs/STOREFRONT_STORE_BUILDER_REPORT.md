# GarmentOS Cloud — Visual Store Builder (Design Studio) Report

## 1. Overview

The GarmentOS Cloud Visual Store Builder (`StorefrontDesignStudio.tsx`) is a comprehensive WYSIWYG studio embedded directly into the factory ERP. It grants tenant administrators granular control over branding, templates, dynamic homepage sections, navigation menus, marketing banners, and media assets.

## 2. Key Architectural Features

### A. Real Live Template Canvas (Interactive Preview)
- Rather than rendering a simplified miniature mockup, the right panel of the Design Studio now imports and mounts the **actual active template component** (`FashionBoutiqueTemplate`, `ModernCatalogTemplate`, `KidsFamilyTemplate`, `PremiumBrandTemplate`).
- It passes draft settings in real time, reflecting every color tweak, banner image, and section rearrangement immediately.
- Real factory finished goods (or sensible sample garments) are loaded via `getPublicStore(undefined, true)` so the preview accurately represents production data.

### B. Device Viewport Switcher
The live preview canvas includes a viewport frame switcher:
- **Desktop** (`w-full` / max-w-full)
- **Tablet** (`max-w-[768px]`)
- **Mobile** (`max-w-[390px]`)
Enclosed in a responsive device frame with drop shadow and centered alignment.

### C. Six Specialized Management Tabs
1. **Templates (`قوالب المتجر`)**:
   - Visual cards for all 4 templates.
   - Shows active badge, recommended use case, and "معاينة وتفعيل" (Preview & Activate) action.
2. **Branding (`الهوية البصرية`)**:
   - Store name, slogan, logo URL picker (with instant link to media library).
   - Primary and secondary brand color pickers with hex inputs and live swatch updates.
   - Font family selector and announcement bar toggle & message.
3. **Hero & Banners (`البانرات والعروض`)**:
   - Hero banner headline, subtitle, CTA text and target link.
   - Separate Desktop and Mobile image URLs for responsive hero art direction.
   - Promotional banner repeater (headline, discount badge, image, link).
4. **Sections Builder (`أقسام الصفحة الرئيسية`)**:
   - List of all 8 dynamic sections.
   - Toggle visibility (show/hide).
   - Up/down reordering buttons directly manipulating `order` indices.
   - Reordering immediately updates the adjacent live preview canvas.
5. **Navigation (`القوائم والتنقل`)**:
   - Custom header navigation links (Label + URL).
   - Custom footer navigation links (Policies, About, Contact, Socials).
   - Quick Add / Remove menu items.
6. **Media Library (`مكتبة الوسائط`)**:
   - Drag-and-drop batch file uploader.
   - Resolution metadata display (`width × height`).
   - Copy URL and Safe Delete with in-use protection modal.

### D. Draft, Publish & Rollback Lifecycle
- **Save Draft**: Persists changes to the tenant's draft store configuration without altering the customer-facing storefront.
- **Publish Changes**: Immediately deploys the configuration to production, updates published timestamp, and invalidates public cache.
- **Rollback / Discard**: Reverts unsaved draft changes back to the currently published state.

## 3. Verification & Evidence
- Visual verification confirmed via headless Chrome screenshot: `docs/storefront-owner-review/studio_live_canvas_desktop.png`.
- Route accessible in ERP at `http://127.0.0.1:5173/?audit_auth=1#/erp/storefront`.
