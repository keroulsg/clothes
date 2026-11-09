# ==============================================================================
# GarmentOS Cloud — Production API Dockerfile (Laravel 13 on PHP 8.4-FPM)
# Multi-Stage Build Architecture
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Composer Dependencies Builder
# ------------------------------------------------------------------------------
FROM composer:2.8 AS vendor

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY apps/api/composer.json apps/api/composer.lock ./

# Install production dependencies without running dev scripts or dev packages
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --no-scripts \
    --no-autoloader \
    --ignore-platform-reqs

# Copy full application code for classmap generation
COPY apps/api/app ./app
COPY apps/api/bootstrap ./bootstrap
COPY apps/api/config ./config
COPY apps/api/database ./database
COPY apps/api/routes ./routes

# Generate optimized, authoritative production classmap
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# ------------------------------------------------------------------------------
# Stage 2: Final Production Runtime Image
# ------------------------------------------------------------------------------
FROM php:8.4-fpm-alpine AS runtime

LABEL maintainer="GarmentOS DevOps Team <devops@garmentos.com>"
LABEL description="GarmentOS Cloud API Production Runtime"

# Install production system libraries & build dependencies
RUN apk add --no-cache \
    postgresql-client \
    postgresql-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    fcgi \
    su-exec \
    && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    linux-headers \
    # Configure and install core extensions
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo_pgsql \
    pgsql \
    pdo_mysql \
    bcmath \
    intl \
    zip \
    gd \
    opcache \
    pcntl \
    # Install PECL Redis extension
    && pecl install redis-6.1.0 \
    && docker-php-ext-enable redis \
    # Clean up build dependencies to minimize image attack surface and size
    && apk del .build-deps \
    && rm -rf /tmp/pear /var/cache/apk/*

WORKDIR /var/www/html

# Apply production PHP and PHP-FPM configuration
COPY docker/api/php.ini /usr/local/etc/php/conf.d/99-garmentos-prod.ini
COPY docker/api/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy application source code
COPY apps/api/ /var/www/html/

# Copy pre-built production vendor directory from Stage 1
COPY --from=vendor /app/vendor /var/www/html/vendor

# Set up directory ownership and strict permissions
RUN mkdir -p /var/www/html/storage/app/private \
             /var/www/html/storage/app/public \
             /var/www/html/storage/framework/cache/data \
             /var/www/html/storage/framework/sessions \
             /var/www/html/storage/framework/views \
             /var/www/html/storage/logs \
             /var/www/html/bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Healthcheck to probe FPM status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD SCRIPT_NAME=/ping SCRIPT_FILENAME=/ping REQUEST_METHOD=GET cgi-fcgi -bind -connect 127.0.0.1:9000 || exit 1

EXPOSE 9000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php-fpm", "-F"]

