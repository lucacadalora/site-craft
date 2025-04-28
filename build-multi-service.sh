#!/bin/bash

# Build script for multi-service setup
set -e

echo "Starting multi-service build process..."

# Create necessary directories
mkdir -p dist/server
mkdir -p dist/client
mkdir -p dist/product

# Build backend server
echo "Building backend API service..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server

# Build frontend editor
echo "Building frontend editor service..."
npx vite build --outDir dist/client

# Build product site
echo "Building product1 site service..."
if [ -f "source/deepsite/vite.config.ts" ]; then
  npx vite build --config source/deepsite/vite.config.ts --outDir dist/product
else
  echo "Warning: source/deepsite/vite.config.ts not found, using fallback config"
  npx vite build --config source/vite.config.ts --outDir dist/product
fi

echo "Build process complete!"
echo "- Backend API: ./dist/server"
echo "- Frontend Editor: ./dist/client"
echo "- Product1 Site: ./dist/product"