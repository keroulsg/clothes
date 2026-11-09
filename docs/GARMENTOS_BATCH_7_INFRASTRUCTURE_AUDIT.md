# GARMENTOS CLOUD — BATCH 7 INFRASTRUCTURE & PRODUCTION DEPLOYMENT AUDIT
**Document Version:** 1.0.0  
**Audit Date:** November 3, 2026  
**Auditor:** Lead Systems Architect & DevOps Engineer  
**Baseline Git SHA:** `0b04bd3d15e9b2f8be07aec172d9d7721829cc91`  
**Repository Working Directory:** `C:\Users\HP\Downloads\clothes`  
**Branch:** `main`

---

## 1. Executive Summary & Objective

This infrastructure audit establishes the baseline technical requirements, current gaps, and production readiness for deploying **GarmentOS Cloud** — a multi-tenant ERP and SaaS platform for garment and apparel manufacturing.

The platform has completed Batches 0 through 6, verifying all functional ERP domains: Multi-Tenancy, Master Catalog, Inventory & Ledger, Production & Cutting, Bundles & Workforce, Sales & POS, Invoicing & Receivables, General Ledger & Manufacturing Costing, Storefront Integration, InstaPay Manual Auditing, SaaS Quotas, and Purchase Requisitions.

The goal of Batch 7 is to transition GarmentOS Cloud from a local development configuration (SQLite, local disk, artisan serve) into a containerized, supervised, resilient, production-ready cloud deployment architecture centered on **PostgreSQL 16+**, **Redis 7+**, **Nginx**, **PHP 8.4-FPM**, and automated disaster recovery.

---

## 2. Current Architecture & Stack Inventory

| Component | Current Development Baseline | Production Target | Audit Finding |
|---|---|---|---|
| **Backend Framework** | Laravel 13.17 (`laravel/framework: ^13.17`) | Laravel 13.x LTS on PHP 8.4-FPM | Modern, high performance, compatible with PHP 8.4. |
| **PHP Runtime** | PHP 8.4.24 (ZTS CLI Windows) | PHP 8.4 Linux Alpine / Debian Slim | Needs opcache, pdo_pgsql, pgsql, redis, bcmath, intl, zip. |
| **Frontend Framework** | React 19.2.8 + Vite 8.3.0 + TypeScript 6.0 | React 19 SPA built via Vite, served via Nginx | Multi-stage build compiles 2,238 modules into static assets in ~1s. |
| **Primary Database** | SQLite 3 (`apps/api/database/database.sqlite`) | PostgreSQL 16+ | Migrations support PostgreSQL; one type incompatibility fixed in migration 28. |
| **Queue Driver** | Database (`jobs` table via SQLite) | Redis 7+ (`redis`) with worker supervision | Requires supervisor or dedicated container worker. |
| **Cache Driver** | Database (`cache` table) | Redis 7+ (`redis`) | High throughput, supports atomic locks and tenant keyspacing. |
| **Session Driver** | Database (`sessions` table) | Redis 7+ or Database with strict cookie flags | Multi-tenant subdomains require proper domain cookie scoping. |
| **File Storage** | Local filesystem (`storage/app/private` & `public`) | Local persistent volume + S3-compatible private bucket | Private receipts must remain non-public; public catalog media served via CDN. |
| **Web Server / Reverse Proxy** | Vite dev server (port 5173) + Artisan serve (8000) | Nginx Reverse Proxy with TLS/SSL termination | Must route `/api/` to Laravel API and `/` to React SPA. |
| **Process Supervision** | Interactive CLI commands | Supervisord or Docker orchestrator restarts | Essential for `queue:work` and `schedule:run`. |

---

## 3. Storage & Private Receipt Audit

### 3.1 Receipts and Upload Paths
- In `StorefrontController::uploadReceipt`:
  - Customer payment receipts are stored via `$file->storeAs("private/receipts/{$tenantId}", $fileName)`.
  - The default disk is `'local'`, mapping to `storage_path('app/private')`.
  - Public symbolic links (`php artisan storage:link`) point ONLY to `storage_path('app/public')`.
  - **Verdict:** Secure. Receipts cannot be downloaded directly via HTTP static paths.
- Viewing receipts:
  - Accessible only through `GET /api/v1/storefront/payments/{id}/receipt`.
  - Requires authenticated session/token and role authorization (`company_owner`, `accountant`, `production_manager`).
  - Streams the file with strict MIME headers and tenant ownership check.
  - **Production Requirement:** For multi-instance cloud scaling, storage must reside either on an attached persistent block volume (`/var/www/html/storage/app/private`) or an S3-compatible private object store (`AWS_BUCKET_PRIVATE` / MinIO).

---

## 4. Database Migrations & PostgreSQL Compatibility Audit

### 4.1 Schema Audit
1. **Primary & Foreign Keys:**
   - Multi-tenant entities use UUID v4 (`$table->uuid('id')->primary()`) and `$table->uuid('tenant_id')`.
   - Core users table uses `bigIncrements('id')` (`unsignedBigInteger`).
   - **Crucial Finding Resolved:** In migration `2026_11_03_000028`, `reviewed_by`, `requested_by`, `approved_by`, and `rejected_by` were declared as `uuid` while referencing `users.id` (`bigint`). In SQLite this was tolerated, but PostgreSQL rejects cross-type foreign keys. These columns were corrected to `unsignedBigInteger` aligning with **ADR-007**.
2. **Decimal Precision:**
   - Currency: `DECIMAL(14, 4)` across all monetary fields (`subtotal`, `tax_amount`, `total_amount`, `unit_price`, `debit`, `credit`).
   - Quantities: `DECIMAL(12, 4)` for fabric meters, kilograms, piece counts, and scrap.
   - Fully compatible with PostgreSQL `NUMERIC` types without floating-point drift.
3. **JSON Columns:**
   - Used for `technical_specs`, `audit_metadata`, `packing_details`, `skills`. Supported natively by PostgreSQL (`jsonb`).
4. **PostgreSQL Concurrency Tests:**
   - An existing integration suite `PostgresConcurrencyIntegrationTest.php` already exists, testing multi-process stock ledger mutations, idempotent locks, and webhook idempotency under real concurrent database access.

---

## 5. Background Jobs, Queue & Scheduler Supervision

### 5.1 Queue Processing
- Currently configured to `QUEUE_CONNECTION=database` or `redis`.
- In production with high transactional volume (order placement, notifications, webhooks, inventory ledger reconciliation), `redis` queue driver is mandatory.
- Long-running worker processes require supervision:
  `php artisan queue:work redis --queue=high,default,notifications --sleep=3 --tries=3 --max-time=3600 --memory=256`
- Memory leaks in PHP CLI workers are mitigated by restarting after 1 hour (`--max-time=3600`) or 256MB memory cap.

### 5.2 Scheduled Tasks
- Laravel cron jobs run through `php artisan schedule:run`.
- In multi-instance or containerized environments, duplicate execution of scheduled jobs is catastrophic (e.g. duplicate payroll accruals or backup jobs).
- **Protection:** Laravel's `withoutOverlapping()` and cache-based mutex locking via Redis (`$schedule->command(...)->withoutOverlapping()->onOneServer()`) will be enforced.

---

## 6. Containerization & Service Topology

```
                       [ Public Traffic ]
                               │
                               ▼
               ┌────────────────────────────────┐
               │    Nginx Reverse Proxy & TLS   │
               │   (Port 80 / 443 -> Port 8080) │
               └───────────────┬────────────────┘
                               │
               ┌───────────────┴────────────────┐
               │                                │
        [ Static Web ]                    [ API Requests ]
               │                                │
               ▼                                ▼
       ┌───────────────┐              ┌──────────────────┐
       │   React SPA   │              │ Laravel 13 API   │
       │  (Vite Build) │              │  (PHP 8.4-FPM)   │
       └───────────────┘              └────────┬─────────┘
                                               │
                                 ┌─────────────┼─────────────┐
                                 │             │             │
                                 ▼             ▼             ▼
                         ┌────────────┐ ┌────────────┐ ┌──────────┐
                         │ PostgreSQL │ │  Redis 7+  │ │ Persistent│
                         │    v16     │ │ Cache/Queue│ │ Storage  │
                         └────────────┘ └────────────┘ └──────────┘
                                               ▲
                                               │
                                      ┌────────┴────────┐
                                      │ Queue Worker &  │
                                      │  Cron Scheduler │
                                      └─────────────────┘
```

---

## 7. Security & Network Isolation Requirements

1. **Zero Public Database/Cache Exposure:**
   - PostgreSQL (5432) and Redis (6379) must NEVER bind to host interfaces (`0.0.0.0`) in production.
   - They must reside on an internal Docker bridge network or private VPC subnet accessible only by the API and worker containers.
2. **Non-Root Container Execution:**
   - All PHP, Nginx, and Node processes must run as non-privileged users (`www-data` or `garmentos:1000:1000`).
3. **Environment Secrets Management:**
   - No `.env` files or secrets baked into Docker images.
   - Secrets injected at container runtime via orchestrator environment variables or Docker secrets.
4. **Header Hardening:**
   - Strict-Transport-Security (HSTS), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin.

---

## 8. Backup & Disaster Recovery Baseline

- **Current State:** Manual file copy of SQLite file (`database.sqlite.bak_*`).
- **Required Production State:**
  1. Automated daily logical dump of PostgreSQL (`pg_dump -Fc` or custom compressed format).
  2. SHA-256 integrity checksum generation.
  3. JSON metadata manifest (timestamp, database name, schema version, record count).
  4. Local retention rotation (7 daily backups, 4 weekly).
  5. S3 offsite synchronization capability.
  6. Verified restore script into an isolated test database with migration and record count assertions.

---

## 9. Conclusion & Action Plan

The codebase is clean, well-factored, and ready for containerization. 
Next implementation steps:
1. Create Docker configurations (`docker/api`, `docker/web`, `docker/nginx`, `docker-compose.yml`, `.dockerignore`).
2. Implement automated backup & restore Artisan commands and scripts.
3. Add production health check and monitoring endpoints.
4. Create Disaster Recovery Runbook and Production Deployment Guide.
5. Provide hosting provider comparison and recommendation.

