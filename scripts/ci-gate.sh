#!/bin/bash
set -e

echo "Starting CI checks..."

echo "1. Running Build..."
npm run build

echo "2. Running Type-checking..."
npm run type-check

echo "3. Running Linting..."
npm run lint

echo "4. Running Tests..."
npm run test:run

echo "CI checks passed successfully!"
