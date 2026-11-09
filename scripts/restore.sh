#!/bin/bash
set -euo pipefail

# ==============================================================================
# GarmentOS Cloud — Automated Database Restore & Recovery Script
# Usage: ./scripts/restore.sh [backup_id] [--target-db=test_db] [--force]
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$ROOT_DIR/apps/api"

echo "=================================================="
echo " GarmentOS Cloud — Disaster Recovery Restore      "
echo "=================================================="

cd "$API_DIR"

php artisan garmentos:restore "$@"

echo "==> Disaster recovery restore script completed."

