# GarmentOS Cloud — Staging Environment Configuration Matrix

**Document Version:** 1.0.0-staging  
**Creation Date:** 2026-11-16  
**Repository:** `keroulsg/clothes`  
**Target Environment:** Staging Deployment (`staging.garmentos.com`)

---

## 1. Classification Methodology

To ensure strict operational clarity, all environment variables are classified into five explicit categories:

1. **Required:** The application or container cannot boot or function without this variable.
2. **Infrastructure-Specific:** Defines internal networking, ports, hosts, and database connections.
3. **Secret:** Highly sensitive credential, private key, or token. Must **never** be committed to Git. Injected via environment variables or secret vaults at deployment time.
4. **External-Provider Dependent:** Credentials or endpoints for third-party services (Paymob, AWS/Cloudflare R2, Mailgun).
5. **Optional:** Feature toggles or operational settings with sensible code defaults.

---

## 2. API Backend Environment Variables Matrix (`apps/api/.env`)

| Variable Name | Category | Classification | Default / Staging Value | Purpose & Operational Impact |
| :--- | :--- | :---: | :--- | :--- |
| `APP_NAME` | Optional | Non-Secret | `"GarmentOS Cloud (Staging)"` | Displays in system notifications, logs, and emails. |
| `APP_ENV` | **Required** | Non-Secret | `staging` | Sets runtime environment. Disables production-only strict gates while enforcing real logging. |
| `APP_KEY` | **Required** | **Secret** | `base64:...` *(32-byte key)* | Encryption key for sessions, encrypted model fields, and Sanctum cookies. Must be unique to Staging. |
| `APP_DEBUG` | **Required** | Non-Secret | `false` | Must be `false` in Staging to ensure real exception handling and prevent stack trace leaks. |
| `APP_URL` | **Required** | Infrastructure | `https://staging.garmentos.com` | Base public URL for generating asset paths, password resets, and webhook callbacks. |
| `APP_LOCALE` | Optional | Non-Secret | `ar` | Default system locale (Arabic). |
| `APP_FALLBACK_LOCALE` | Optional | Non-Secret | `en` | Fallback language for missing translation strings. |
| `LOG_CHANNEL` | Optional | Non-Secret | `stack` | Routes logs to both daily rotating files and standard error. |
| `LOG_LEVEL` | Optional | Non-Secret | `info` | Logging verbosity (`debug`, `info`, `warning`, `error`). Recommended `info` for Staging. |
| `DB_CONNECTION` | **Required** | Infrastructure | `pgsql` | Database driver. **Must be `pgsql`** in Staging to validate PostgreSQL concurrency. |
| `DB_HOST` | **Required** | Infrastructure | `postgres` *(or internal IP)* | Internal hostname/IP of the PostgreSQL container or managed database. |
| `DB_PORT` | **Required** | Infrastructure | `5432` | Standard PostgreSQL port. |
| `DB_DATABASE` | **Required** | Infrastructure | `garmentos_staging` | Staging database catalog name. Isolated from any production database. |
| `DB_USERNAME` | **Required** | Infrastructure | `garmentos_staging_user` | Dedicated database role with scoped permissions. |
| `DB_PASSWORD` | **Required** | **Secret** | `[SECURE_RANDOM_PASSWORD]` | Strong password generated specifically for Staging. |
| `DB_SSLMODE` | Optional | Infrastructure | `prefer` *(or `require`)* | Enforces SSL encryption for external managed databases. |
| `REDIS_CLIENT` | Optional | Infrastructure | `phpredis` | High-performance PECL C-extension driver for Redis. |
| `REDIS_HOST` | **Required** | Infrastructure | `redis` *(or internal IP)* | Hostname of the Redis cache/queue container. |
| `REDIS_PORT` | **Required** | Infrastructure | `6379` | Standard Redis port. |
| `REDIS_PASSWORD` | **Required** | **Secret** | `[SECURE_RANDOM_REDIS_PASSWORD]` | Authentication password for Redis. |
| `QUEUE_CONNECTION` | **Required** | Infrastructure | `redis` | Directs background jobs (invoicing, payments, notifications) to Redis queues. |
| `CACHE_STORE` | **Required** | Infrastructure | `redis` | Caching driver. Uses Redis for atomic locks and fast key-value lookups. |
| `SESSION_DRIVER` | **Required** | Infrastructure | `redis` | Stores authenticated user sessions in Redis to support multi-container scaling. |
| `FILESYSTEM_DISK` | **Required** | Infrastructure | `local` *(or `s3`)* | Storage driver for CAD files, product images, and receipts. Default `local` on Staging persistent volume. |
| `AWS_ACCESS_KEY_ID` | Optional | External Provider | `[S3_KEY_IF_APPLICABLE]` | Object storage key if using Cloudflare R2 / AWS S3. |
| `AWS_SECRET_ACCESS_KEY` | Optional | **Secret** | `[S3_SECRET_IF_APPLICABLE]` | Object storage secret if using Cloudflare R2 / AWS S3. |
| `AWS_BUCKET` | Optional | Infrastructure | `garmentos-staging-storage` | S3 bucket name. |
| `AWS_ENDPOINT` | Optional | Infrastructure | `https://[account].r2.cloudflarestorage.com` | Custom endpoint for Cloudflare R2 or MinIO. |
| `PLATFORM_ADMIN_ACTIVATION_KEY`| **Required** | **Secret** | `[32+_CHAR_RANDOM_SECRET]` | Master key for manual subscription activations and super-admin overrides. |
| `PAYMENT_WEBHOOK_SECRET` | Optional | **Secret** | `[HMAC_SHARED_SECRET]` | Validates inbound webhook signatures from payment gateways. |
| `PAYMOB_HMAC_SECRET` | Optional | **Secret** | `[PAYMOB_HMAC_IF_INTEGRATED]` | HMAC calculation key for Paymob card payment notifications. |
| `CORS_ALLOWED_ORIGINS` | **Required** | Infrastructure | `https://staging.garmentos.com,https://app.staging.garmentos.com` | Strict CORS whitelist allowing SPA requests. |
| `SANCTUM_STATEFUL_DOMAINS`| **Required** | Infrastructure | `staging.garmentos.com,app.staging.garmentos.com` | Domains permitted to maintain stateful Sanctum session cookies. |
| `SESSION_DOMAIN` | Optional | Infrastructure | `.staging.garmentos.com` | Enables cross-subdomain session sharing across tenant storefronts. |

---

## 3. Web Frontend Environment Variables Matrix (`apps/web/.env`)

These variables are baked into the static build during `npm run build`:

| Variable Name | Category | Classification | Staging Value | Purpose & Operational Impact |
| :--- | :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **Required** | Infrastructure | `/api/v1` | Relative path used by browser API client to reverse-proxy to backend. |
| `VITE_API_URL` | Optional | Infrastructure | `https://staging.garmentos.com/api/v1` | Absolute API endpoint fallback. |
| `VITE_APP_NAME` | Optional | Non-Secret | `"GarmentOS Cloud (Staging)"` | Application header brand text. |
| `VITE_DEFAULT_LANG` | Optional | Non-Secret | `ar` | Default interface language (Arabic RTL). |
| `VITE_PUBLIC_URL` | **Required** | Infrastructure | `https://staging.garmentos.com` | Root public URL for storefront links and redirects. |
| `VITE_APP_URL` | **Required** | Infrastructure | `https://staging.garmentos.com/#/app` | Deep link to factory ERP application dashboard. |

---

## 4. Gap Analysis & Missing Variables Audit

Direct comparison between `.env.example` and codebase inspection identified the following missing or unconfigured variables:

1. **`RUN_MIGRATIONS`:**
   - **Current State:** Used in `docker-compose.yml` (`RUN_MIGRATIONS: "${RUN_MIGRATIONS:-true}"`) and `docker/api/entrypoint.sh`.
   - **Gap:** Missing from `apps/api/.env.example`.
   - **Resolution:** Documented explicitly. In Staging, automated migration on boot is acceptable; in Production, it must be `false` (manual execution only).

2. **`DB_SSLMODE`:**
   - **Current State:** Read in `config/database.php` (`env('DB_SSLMODE', 'prefer')`).
   - **Gap:** Missing from `apps/api/.env.example`.
   - **Resolution:** Added to Staging matrix to support managed cloud PostgreSQL instances requiring SSL (`sslmode=require`).

3. **`REDIS_PASSWORD`:**
   - **Current State:** Used in `docker-compose.yml` with `:?` mandatory assertion, but defaulted to `null` in `apps/api/.env.example`.
   - **Gap:** Security inconsistency.
   - **Resolution:** Mandatory in Staging matrix to enforce password authentication.

4. **Flysystem S3 Package Dependency:**
   - **Current State:** S3 disk configuration exists, but `league/flysystem-aws-s3-v3` is absent from `composer.json`.
   - **Risk:** Setting `FILESYSTEM_DISK=s3` without the package will cause runtime crashes on any file upload.
   - **Recommendation:** Maintain `FILESYSTEM_DISK=local` with persistent volume `garmentos_storage` until the package is installed.
