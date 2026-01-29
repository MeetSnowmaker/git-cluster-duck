#!/bin/bash
set -e

echo "=== Installing Git (needed for integration tests) ==="
apt-get update && apt-get install -y --no-install-recommends git > /dev/null 2>&1
git config --global user.email "test@example.com"
git config --global user.name "Test User"
git config --global init.defaultBranch main

echo "=== Starting TypeScript Watch (background) ==="
npx tsc --watch --preserveWatchOutput &
TSC_PID=$!

# Wait for initial build
sleep 2

echo "=== Starting Vitest Watch ==="
# Run vitest in watch mode - it will re-run on file changes
npx vitest --watch

# Cleanup tsc when vitest exits
kill $TSC_PID 2>/dev/null || true
