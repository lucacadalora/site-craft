# AI Landing Page Generator - Cloud Run Optimized Image
# Multi-stage build for optimized production deployment

# ========================================
# Build stage
# ========================================
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libpq-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./

# Install all dependencies, including dev dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ========================================
# Production stage
# ========================================
FROM node:20-slim AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose Cloud Run port (8080 is the default)
EXPOSE 8080

# Start the application
CMD ["node", "dist/index.js"]