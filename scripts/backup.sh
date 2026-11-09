#!/bin/bash
set -euo pipefail

# ==============================================================================
# GarmentOS Cloud — Automated Database Backup Script
# Usage: ./scripts/backup.sh [--destination=local|s3|all] [--retention=7] [--encrypt]
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$ROOT_DIR/apps/api"

echo "=================================================="
echo " GarmentOS Cloud — Production Database Backup     "
echo "=================================================="

cd "$API_DIR"

DESTINATION="${1:---destination=local}"
RETENTION="${2:---retention=7}"

php artisan garmentos:backup "$DESTINATION" "$RETENTION"

echo "==> Backup execution finished."

