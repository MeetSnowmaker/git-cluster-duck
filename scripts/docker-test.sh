#!/bin/bash
set -e

echo "=== Phase 1: Unit Tests (no git required) ==="
npm run test:unit

echo ""
echo "=== Phase 2: Integration - No Git Installed ==="
npm run test:integration -- --testNamePattern="no-git"

echo ""
echo "=== Installing Git ==="
apt-get update && apt-get install -y --no-install-recommends git
git --version

echo ""
echo "=== Phase 3: Integration - No Config ==="
npm run test:integration -- --testNamePattern="no-config"

echo ""
echo "=== Configuring Git ==="
git config --global user.email "test@example.com"
git config --global user.name "Test User"
git config --global init.defaultBranch main

echo ""
echo "=== Phase 4: Integration - Fully Configured ==="
npm run test:integration -- --testNamePattern="configured"

echo ""
echo "=== Phase 5: E2E - Interactive TTY ==="
USE_DIST=1 npm run test:e2e

echo ""
echo "=== All Tests Passed ==="
