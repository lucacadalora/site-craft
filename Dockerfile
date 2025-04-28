# Use Node.js LTS
FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Setup environment
ENV NODE_ENV=production
ENV PORT=5000
# The DATABASE_URL should be passed as an environment variable during runtime

# Install necessary system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Required for bcrypt
    build-essential \
    python3 \
    # Required for PostgreSQL client
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS deps
RUN npm ci

# Build stage
FROM deps AS builder
COPY . .
RUN npm run build

# Production stage
FROM base AS runner

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy built application
COPY --from=builder /app/dist ./dist
# Copy necessary assets
COPY --from=builder /app/public ./public

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["node", "dist/index.js"]