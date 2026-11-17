# GarmentOS Cloud — Staging Rollback & Recovery Plan

**Document Version:** 1.0.0-staging  
**Creation Date:** 2026-11-16  
**Repository:** `keroulsg/clothes`  
**Target Environment:** Staging Deployment  
**Audience:** DevOps Engineer, Incident Commander, On-Call Engineer

---

## 1. Rollback Authority & Decision Criteria

A rollback must be initiated immediately upon any of the following failure conditions:
1. **Critical Migration Failure:** A database migration fails midway, leaving the schema in an inconsistent state.
2. **Container Crash Loop:** `api` or `web` container exits or fails health checks continuously.
3. **PostgreSQL Concurrency Failure:** `PostgresConcurrencyIntegrationTest.php` reports transactional deadlocks or unhandled concurrency conflicts.
4. **Data Isolation Breach:** Cross-tenant leakage observed during smoke tests.
5. **Core Service Outage:** HTTP 500 errors on authentication, ERP production order creation, or storefront checkout.

---

## 2. Step-by-Step Rollback Procedure

### Step 1: Activate Maintenance Mode
Prevent users and incoming requests from executing against the broken state:
```bash
docker exec -t garmentos-api php artisan down \
    --secret="staging-bypass-key-2026" \
    --render="errors::503" \
    --retry=60
echo "✓ Staging placed in maintenance mode"
```

### Step 2: Stop Background Processing Daemons
Halt queue workers immediately to prevent processing background jobs with conflicting schema expectations:
```bash
docker stop garmentos-worker garmentos-scheduler
echo "✓ Queue workers and scheduler paused"
```

### Step 3: Database Restoration from Pre-Deployment Snapshot
Restore the database to the verified pre-migration state using the snapshot created in Phase 2 of the runbook:
```bash
# Locate latest pre-deploy snapshot
LATEST_SNAPSHOT=$(ls -t /var/backups/garmentos/garmentos_staging_pre_deploy_*.sql.gz | head -1)
echo "==> Restoring database from snapshot: ${LATEST_SNAPSHOT}..."

# Terminate active backend database connections
docker exec -t garmentos-postgres psql -U garmentos_staging_user -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'garmentos_staging' AND pid <> pg_backend_pid();"

# Restore database
gunzip -c "${LATEST_SNAPSHOT}" | docker exec -i garmentos-postgres psql -U garmentos_staging_user -d garmentos_staging

echo "✓ Database successfully restored to pre-migration snapshot"
```

### Step 4: Code & Container Rollback
If the failure is caused by application code defects, revert container images to the previous stable release tag:
```bash
# Revert to previous verified commit/tag
git checkout <PREVIOUS_STABLE_SHA>

# Rebuild and restart containers
docker compose build
docker compose up -d
```

### Step 5: Cache Invalidation & Warming
Clear any corrupted or stale application state:
```bash
docker exec -t garmentos-api php artisan optimize:clear
docker exec -t garmentos-api php artisan config:cache
docker exec -t garmentos-api php artisan route:cache
docker exec -t garmentos-api php artisan view:cache
```

### Step 6: Restart Background Daemons
```bash
docker start garmentos-worker garmentos-scheduler
docker exec -t garmentos-api php artisan queue:restart
echo "✓ Queue workers and scheduler reactivated"
```

### Step 7: Deactivate Maintenance Mode
```bash
docker exec -t garmentos-api php artisan up
echo "✓ Application restored to normal operational mode"
```

---

## 3. Post-Rollback Verification

1. **Verify Health Endpoint:**
   ```bash
   curl -f -I http://127.0.0.1:8080/up
   # Must return HTTP 200
   ```
2. **Verify Database Integrity:**
   ```bash
   docker exec -t garmentos-api php artisan migrate:status
   ```
3. **Verify Tenant ERP Access:**
   Execute a test login under a test factory tenant to confirm sessions and database connectivity are restored.

---

## 4. Post-Mortem & Incident Documentation

Following any rollback:
1. Preserve container logs:
   ```bash
   docker logs garmentos-api > /var/log/garmentos/rollback_api_$(date +%Y%m%d).log 2>&1
   docker logs garmentos-postgres > /var/log/garmentos/rollback_pg_$(date +%Y%m%d).log 2>&1
   ```
2. Document the root cause, failed migration/code line, and remediation plan in `docs/deployment/INCIDENT_LOG.md`.
3. Do not re-attempt deployment until the root cause has been addressed in code and verified via automated tests.
