#!/bin/bash
set -e

COVERAGE_DIR="/app/coverage"
mkdir -p "$COVERAGE_DIR"

echo "=== Phase 1: Unit Tests (no git required) ==="
npm run test:unit -- --coverage --coverage.reportsDirectory="$COVERAGE_DIR/unit" --coverage.reporter=json

echo ""
echo "=== Phase 2: Integration - No Git Installed ==="
npm run test:integration -- --coverage --coverage.reportsDirectory="$COVERAGE_DIR/no-git" --coverage.reporter=json --testNamePattern="no-git"

echo ""
echo "=== Installing Git ==="
apt-get update && apt-get install -y --no-install-recommends git
git --version

echo ""
echo "=== Phase 3: Integration - No Config ==="
npm run test:integration -- --coverage --coverage.reportsDirectory="$COVERAGE_DIR/no-config" --coverage.reporter=json --testNamePattern="no-config"

echo ""
echo "=== Configuring Git ==="
git config --global user.email "test@example.com"
git config --global user.name "Test User"
git config --global init.defaultBranch main

echo ""
echo "=== Phase 4: Integration - Fully Configured ==="
npm run test:integration -- --coverage --coverage.reportsDirectory="$COVERAGE_DIR/configured" --coverage.reporter=json --testNamePattern="configured"

echo ""
echo "=== Merging Coverage Reports ==="
mkdir -p "$COVERAGE_DIR/.nyc_output"

# Collect all coverage files into flat directory for nyc
cp "$COVERAGE_DIR/unit/coverage-final.json" "$COVERAGE_DIR/.nyc_output/unit.json" 2>/dev/null || true
cp "$COVERAGE_DIR/no-git/coverage-final.json" "$COVERAGE_DIR/.nyc_output/no-git.json" 2>/dev/null || true
cp "$COVERAGE_DIR/no-config/coverage-final.json" "$COVERAGE_DIR/.nyc_output/no-config.json" 2>/dev/null || true
cp "$COVERAGE_DIR/configured/coverage-final.json" "$COVERAGE_DIR/.nyc_output/configured.json" 2>/dev/null || true

# Merge and generate report
mkdir -p "$COVERAGE_DIR/merged"
nyc merge "$COVERAGE_DIR/.nyc_output" "$COVERAGE_DIR/merged/coverage.json"
nyc report --reporter=text --reporter=html --temp-dir="$COVERAGE_DIR/merged" --report-dir="$COVERAGE_DIR/merged"

echo ""
echo "=== Coverage Complete ==="
echo "Results in: $COVERAGE_DIR/merged"
