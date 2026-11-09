#!/bin/sh
set -e

# GarmentOS API Container Entrypoint
echo "==> Initializing GarmentOS API container environment..."

# Ensure required storage and cache directories exist
mkdir -p /var/www/html/storage/app/private \
         /var/www/html/storage/app/public \
         /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

# Fix permissions if running as root
if [ "$(id -u)" = "0" ]; then
    chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache
fi

# Run database migrations if explicitly enabled
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "==> Running production database migrations..."
    php artisan migrate --force --no-interaction
fi

# Execute main process
echo "==> Starting application process: $@"
exec "$@"

