# GarmentOS Cloud — Engineering Hardening Baseline Report

**Date:** October 31, 2026  
**Auditor:** Lead Architect & Application Security Auditor  
**Scope:** Forensic Verification of GLM-5.3 Engineering Audit Findings  
**Repository Branch:** `main` at `e9215d2`

---

## 1. Executive Summary & Verification Matrix

Every finding from the audit was physically inspected in the source code and executed against the runtime environment.

| # | Audit Finding Category | Verification Status | Exact File & Line | Security / Architectural Impact |
|---|---|---|---|---|
| **SEC-01** | Unauthenticated API Exception Handling | **VERIFIED** | `bootstrap/app.php:21-25`<br>`vendor/laravel/framework/.../Authenticate.php:104` | **Critical:** Non-JSON requests (or browser/bot visits) to protected API routes throw 500 `Route [login] not defined.` and leak complete stack traces. |
| **SEC-02** | Sanctum Token Expiration & Lifecycle | **VERIFIED** | `config/sanctum.php:53`<br>`TenantController.php:124, 205` | **High:** Personal access tokens never expire (`'expiration' => null`). Tokens persist indefinitely until explicitly revoked. |
| **SEC-03** | API Rate Limiting Gaps | **VERIFIED** | `routes/api.php:28-54` | **High:** Only login (10/min) and admin activation (5/min) are throttled. Public storefront, marketplace RFQs, export jobs, and business endpoints have no rate limits. |
| **SEC-04** | Webhook Route Duplication & Ingestion | **VERIFIED** | `routes/api.php:56-60`<br>`SubscriptionWebhookController.php:25-75` | **Medium:** 4 endpoints route to the same controller without individual throttle tiers. Webhooks need dedicated rate limits and clear provider canonical paths. |
| **PERF-01**| Monolithic Frontend Bundle (Lack of Lazy Loading)| **VERIFIED** | `apps/web/src/App.tsx:1-70`<br>`apps/web/vite.config.ts` | **High:** Single monolithic client bundle (`1,341.89 kB` JS, `450.63 kB` CSS). All 12 tabs and 20+ modals are loaded upfront on the initial page load. |
| **PERF-02**| `App.tsx` Monolith Complexity | **VERIFIED** | `apps/web/src/App.tsx` (4,205 lines) | **High:** Giant single file orchestrating routing, deep linking, modal state, inventory modals, and views, increasing re-render overhead. |
| **UI-01**  | Flash of LTR (DIR Layout Shift) on Startup | **VERIFIED** | `apps/web/index.html:2, 17-35` | **Medium:** `index.html` hardcodes `<html lang="en">` without an inline language/direction script, causing an LTR flash for Arabic users before React loads. |
| **UI-02**  | Design System Token Standardization | **VERIFIED** | `apps/web/src/components/*` | **Medium:** Semantic color consistency needed across action buttons, focus rings, and accessible ARIA attributes on interactive icon buttons. |
| **ONB-01** | Warehouse Provisioning & Plan Quota Alignment | **VERIFIED** | `TenantController.php:69-75`<br>`SubscriptionUsageService.php:48-61` | **Medium:** Starter plan limits warehouses to 1. Provisioning must remain strictly single-warehouse for Starter while supporting optional modular expansion. |

---

## 2. Detailed Verification & Reproduction Evidence

### SEC-01: Authentication Exception Handling (HTTP 500 Route [login] not defined)
- **Observed Behavior:**
  Requesting `GET /api/v1/warehouses` with `Accept: text/html` returned:
  ```json
  HTTP/1.1 500 Internal Server Error
  {
      "message": "Route [login] not defined.",
      "exception": "Symfony\\Component\\Routing\\Exception\\RouteNotFoundException",
      "file": "...\\Illuminate\\Routing\\UrlGenerator.php",
      "line": 542,
      "trace": [...]
  }
  ```
- **Root Cause:** Laravel's default `Authenticate` middleware invokes `route('login')` when `!$request->expectsJson()`. Since GarmentOS is a headless REST API backend without web blade login routes, `route('login')` does not exist.
- **Minimal Safe Fix:** In `bootstrap/app.php`, configure `$middleware->redirectGuestsTo(fn (Request $request) => null)` and add an exception render handler for `AuthenticationException` to guarantee a clean JSON HTTP 401 response for all `api/*` routes regardless of Accept headers.

---

### SEC-02: Sanctum Token Expiration & Token Lifecycle
- **Observed Behavior:**
  In `config/sanctum.php:53`, `'expiration' => null`. Tokens created during login or registration never expire.
- **Root Cause:** Default skeleton configuration was unchanged.
- **Security Impact:** If a bearer token is leaked from browser storage or intercepted, it remains valid forever until the user clicks Logout or the database row is deleted.
- **Minimal Safe Fix:**
  1. Add configurable expiration in `config/sanctum.php` (e.g. `env('SANCTUM_EXPIRATION_MINUTES', 10080)` - 7 days for factory floor terminals, or configurable via `.env`).
  2. Maintain current revocation upon logout (`$user->currentAccessToken()->delete()`).
  3. Ensure expired tokens return HTTP 401 and trigger seamless re-authentication prompt in the UI without losing form inputs.

---

### SEC-03: API Rate Limiting Across Risk Tiers
- **Observed Behavior:**
  Only `login` and `register-company` have `throttle:10,1`. All authenticated ERP business routes, public storefront routes, RFQ submissions, and report exports have NO rate limiters.
- **Security Impact:** Potential for denial of service, resource exhaustion (large financial CSV exports), and brute-force abuse of public storefront endpoints.
- **Minimal Safe Fix:** Define named rate limiters in `bootstrap/app.php`:
  - `auth`: 10 requests / minute
  - `public-storefront`: 60 requests / minute
  - `marketplace-rfq`: 15 requests / minute
  - `api-read`: 120 requests / minute per tenant/user
  - `api-write`: 60 requests / minute per tenant/user
  - `heavy-export`: 10 requests / minute per tenant/user
  - `webhooks`: 60 requests / minute per IP

---

### PERF-01: Monolithic Frontend Bundle (1.34 MB JS / 450 KB CSS)
- **Observed Behavior:**
  Vite production build emits:
  ```
  dist/assets/index-DaPOnMWu.css    450.63 kB │ gzip:  59.88 kB
  dist/assets/index-VOsn6SC1.js   1,341.89 kB │ gzip: 286.78 kB
  (!) Some chunks are larger than 500 kB after minification.
  ```
- **Root Cause:** Direct synchronous imports of all 12 business tabs and admin views in `App.tsx`.
- **Minimal Safe Fix:** Use `React.lazy()` and `<Suspense fallback={<TabLoadingSkeleton />}>` for non-critical tab views (`TenantSubscriptionView`, `WaslatWorshTab`, `AccountingTab`, `HrTab`, `SalesTab`, `SubcontractingTab`, `StorefrontTab`, `MaintenanceTab`, `PlatformAdminDashboard`).

---

### UI-01: Initial Document Language / Direction Flash
- **Observed Behavior:**
  `index.html` initializes dark/light theme via inline script, but has hardcoded `<html lang="en">` without direction initialization. When an Arabic user loads the application, the page starts in LTR and flips to RTL after React renders.
- **Minimal Safe Fix:** Add inline language and direction detection in `index.html` (reading `localStorage.getItem('garmentos_lang')` or `?lang=` query parameter, defaulting to Arabic `dir="rtl"` and `lang="ar"` for the Egyptian market while preserving English `dir="ltr"` for users who chose English).

