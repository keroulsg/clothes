# ==============================================================================
# GarmentOS Cloud — Production Web/Frontend Dockerfile (React 19 + Vite)
# Multi-Stage Build Architecture
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Node.js Dependencies & Production Build
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests for cache layer efficiency
COPY apps/web/package.json apps/web/package-lock.json ./

# Install clean dependencies
RUN npm ci

# Copy web application source code
COPY apps/web/ ./

# Build arguments for Vite environment
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APP_NAME="GarmentOS Cloud"

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

# Compile production bundle (Typecheck and Minify)
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Nginx Static File Serving & Reverse Proxy
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

LABEL maintainer="GarmentOS DevOps Team <devops@garmentos.com>"
LABEL description="GarmentOS Cloud Production Web Reverse Proxy"

# Apply custom production Nginx configurations
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy pre-compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure proper ownership and permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

