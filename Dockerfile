FROM node:20-alpine

# Install system dependencies for Puppeteer, MariaDB, and sharp (native builds)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    mariadb-client \
    vips-dev \
    git \
    python3 \
    make \
    g++ \
    pkgconfig \
    libc6-compat

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create directories for persistent volumes (Fly.io mounts)
RUN mkdir -p whatsapp_auth uploads dist && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Fly.io expects 8080 by default)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["node", "server.js"]