# GarmentOS Cloud — Staging Deployment Runbook

**Document Version:** 1.0.0-staging  
**Creation Date:** 2026-11-16  
**Repository:** `keroulsg/clothes`  
**Target Environment:** Staging Server Instance  
**Audience:** DevOps Engineer, Lead Architect, System Administrator

---

## 1. Overview & Golden Rules

This runbook defines the exact, repeatable sequence of operations required to provision and deploy GarmentOS Cloud to the isolated Staging environment.

> [!CAUTION]
> **STRICT SAFETY DIRECTIVES:**
> 1. Never execute migrations against a live database without taking a verified pre-migration snapshot first.
> 2. Never deploy uncommitted code or branches that diverge from the verified baseline `d9516cbedac4c59f5a613ea5107854d431ce48e7`.
> 3. Never run `php artisan migrate:fresh` or destructive wipe commands on Staging.

---

## 2. Pre-Deployment Verification (Phase 0)

Execute these checks on the staging provisioning host before triggering container builds:

### Step 0.1: Codebase Baseline & SHA Verification
```bash
git checkout main
CURRENT_SHA=$(git rev-parse HEAD)
echo "Current HEAD: ${CURRENT_SHA}"
# Must match verified baseline d9516cbedac4c59f5a613ea5107854d431ce48e7
if [ "${CURRENT_SHA}" != "d9516cbedac4c59f5a613ea5107854d431ce48e7" ]; then
    echo "[!] ERROR: HEAD does not match verified staging baseline!"
    exit 1
fi
```

### Step 0.2: Working Tree Hygiene
```bash
git status --short
# Output must be completely empty (clean working tree)
```

### Step 0.3: Environment Security Audit
```bash
# Verify all required Staging environment variables are injected
php apps/api/artisan garmentos:env-check --fail-on-missing
```

---

## 3. Build & Artifact Packaging (Phase 1)

### Step 1.1: Frontend Production Build
```bash
echo "==> Building React 19 Frontend Bundle..."
cd apps/web
npm ci
npm run build
# Verify build output exists
test -f dist/index.html && echo "✓ Frontend bundle generated successfully"
cd ../..
```

### Step 1.2: Multi-Stage Docker Container Build
```bash
echo "==> Building Production Docker Containers..."
docker compose build --pull
```

---

## 4. Pre-Migration Database Snapshot (Phase 2)

Prior to applying any schema migrations, a point-in-time snapshot must be saved:

```bash
SNAPSHOT_NAME="garmentos_staging_pre_deploy_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "==> Generating database snapshot: ${SNAPSHOT_NAME}..."

docker exec -t garmentos-postgres pg_dump \
    -U garmentos_staging_user \
    -d garmentos_staging \
    --no-owner \
    --clean \
    --if-exists | gzip > "/var/backups/garmentos/${SNAPSHOT_NAME}"

# Verify snapshot size > 0
if [ ! -s "/var/backups/garmentos/${SNAPSHOT_NAME}" ]; then
    echo "[!] CRITICAL: Database snapshot failed or is empty! Halting deployment."
    exit 1
fi
echo "✓ Pre-migration database snapshot saved successfully"
```

---

## 5. Schema Migration & Seeding (Phase 3)

Apply incremental migrations and ensure SaaS plans are populated:

```bash
echo "==> Executing Database Migrations..."
docker exec -t garmentos-api php artisan migrate --force --no-interaction

echo "==> Ensuring SaaS Plans, Features & Meters are Seeded..."
docker exec -t garmentos-api php artisan db:seed --class=SubscriptionPlanSeeder --force --no-interaction

echo "==> Checking Migration Status..."
docker exec -t garmentos-api php artisan migrate:status
```

---

## 6. Service Activation & Queue Worker Restart (Phase 4)

Activate the container stack and restart background processing daemons:

```bash
echo "==> Launching Container Stack..."
docker compose up -d

echo "==> Restarting Queue Workers..."
docker exec -t garmentos-api php artisan queue:restart

echo "==> Clearing & Warming Application Caches..."
docker exec -t garmentos-api php artisan optimize:clear
docker exec -t garmentos-api php artisan config:cache
docker exec -t garmentos-api php artisan route:cache
docker exec -t garmentos-api php artisan view:cache
```

---

## 7. Post-Deployment Verification & Smoke Tests (Phase 5)

Validate all services are operational before declaring the deployment successful:

### Step 5.1: Container Health Status
```bash
docker compose ps
# All services (api, web, postgres, redis, worker, scheduler) must show 'healthy' or 'running'
```

### Step 5.2: Application Health Probe
```bash
# Probe internal API health endpoint
curl -f -s -I http://127.0.0.1:8080/up | grep -E "HTTP/[12].* 200" && echo "✓ Backend /up probe healthy"

# Probe public frontend
curl -f -s -I http://127.0.0.1:8080/ | grep -E "HTTP/[12].* 200" && echo "✓ Frontend index probe healthy"
```

### Step 5.3: Execute PostgreSQL Concurrency Integration Tests
With live PostgreSQL now available, execute the concurrency test suite:
```bash
echo "==> Running Genuine PostgreSQL Concurrency Tests in Staging..."
docker exec -t garmentos-api php artisan test tests/Feature/PostgresConcurrencyIntegrationTest.php
# Must pass 6/6 tests with 0 failures
```

### Step 5.4: Verify SaaS Public Plans Endpoint
```bash
curl -s http://127.0.0.1:8080/api/v1/saas/plans/public | grep "starter" && echo "✓ Public pricing plans API operational"
```

---

## 8. Rollback Triggers

If any of the following events occur during deployment, immediately invoke the [STAGING_ROLLBACK_PLAN.md](file:///c:/Users/HP/Downloads/clothes/docs/deployment/STAGING_ROLLBACK_PLAN.md):
1. `php artisan migrate` fails with an unrecoverable SQL error.
2. `PostgresConcurrencyIntegrationTest.php` fails due to lock contention or connection pooling errors.
3. The `/up` health probe returns non-200 for $>60$ seconds after container boot.
4. Core login or tenant resolution fails during initial smoke tests.
