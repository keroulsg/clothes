# GarmentOS Cloud — Storefront Security & Isolation Report

## 1. Executive Summary

Security and strict multi-tenant isolation are core architectural pillars of GarmentOS Cloud. All storefront APIs, admin endpoints, and media pipelines enforce rigorous defense-in-depth mechanisms to protect customer data, factory intellectual property, and system stability.

## 2. Security Controls Implemented & Verified

### A. Strict Multi-Tenant Isolation
- Every storefront request resolves the tenant context via subdomain, custom domain, or explicit tenant identifier.
- Database queries scope strictly by `tenant_id`.
- Product queries, category lookups, orders, customers, and media records belonging to Tenant A can never be queried or altered by Tenant B.
- Confirmed by tenant boundary tests in `StorefrontApiTest.php`.

### B. Media Upload Sanitization & XSS Prevention
- MIME validation strictly enforces `image/jpeg`, `image/png`, `image/webp`.
- **SVG Exclusion**: SVG uploads are explicitly rejected. SVGs can carry embedded `<script>` payloads and malicious XML entities (XXE). Disallowing SVGs in public storefront media upload eliminates stored XSS vectors.
- Dimension verification via `getimagesize()` ensures the uploaded file is a valid image binary, rejecting spoofed extensions (e.g., PHP scripts renamed to `.jpg`).
- Random hash filename generation (`md5(uniqid()) . '.' . $extension`) prevents directory traversal attacks and overwriting existing assets.

### C. Media Reference Integrity
- `DELETE /api/v1/storefront/media` prevents accidental or malicious deletion of images currently referenced in live store branding, hero banners, or promotional modules.
- Deletion requires explicit `force=true` parameter after displaying an in-use warning.

### D. Input Validation & CSRF Protection
- Customer orders undergo strict schema validation (recipient phone format, city/address presence, items array structure).
- Quantities must be positive integers; negative or fractional inputs are rejected.
- Admin studio actions are gated by Sanctum authentication and tenant authorization middleware.

### E. Rate Limiting & Denial of Service Protection
- Public storefront API routes (`/api/v1/storefront/*`) are throttled to 60 requests per minute per IP.
- Order submission route is throttled to 10 requests per minute per IP to prevent automated checkout spam.

## 3. Security Test Coverage
- `StorefrontMediaAndDesignStudioTest::test_media_upload_rejects_svg_and_disallowed_formats`: Verified passing.
- `StorefrontMediaAndDesignStudioTest::test_cannot_delete_media_actively_referenced_without_force`: Verified passing.
- `StorefrontApiTest`: Tenant isolation tests verified passing.
