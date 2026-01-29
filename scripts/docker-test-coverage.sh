#!/bin/bash
set -e

COVERAGE_DIR="/app/coverage"
V8_COVERAGE_DIR="$COVERAGE_DIR/v8-subprocess"
mkdir -p "$COVERAGE_DIR"

echo "=== Phase 1: Unit Tests (no git required) ==="
npm run test:unit -- --coverage --coverage.reportsDirectory="$COVERAGE_DIR/unit" --coverage.reporter=json

echo ""
echo "=== Phase 2: Integration - No Git Installed ==="
# Enable V8 coverage for subprocess CLI calls
mkdir -p "$V8_COVERAGE_DIR/no-git"
NODE_V8_COVERAGE="$V8_COVERAGE_DIR/no-git" \
  npm run test:integration -- --coverage --coverage.reportsDirectory="$COVERAGE_DIR/no-git" --coverage.reporter=json --testNamePattern="no-git"

echo ""
echo "=== Installing Git ==="
apt-get update && apt-get install -y --no-install-recommends git
git --version

echo ""
echo "=== Phase 3: Integration - No Config ==="
mkdir -p "$V8_COVERAGE_DIR/no-config"
NODE_V8_COVERAGE="$V8_COVERAGE_DIR/no-config" \
  npm run test:integration -- --coverage --coverage.reportsDirectory="$COVERAGE_DIR/no-config" --coverage.reporter=json --testNamePattern="no-config"

echo ""
echo "=== Configuring Git ==="
git config --global user.email "test@example.com"
git config --global user.name "Test User"
git config --global init.defaultBranch main

echo ""
echo "=== Phase 4: Integration - Fully Configured ==="
mkdir -p "$V8_COVERAGE_DIR/configured"
NODE_V8_COVERAGE="$V8_COVERAGE_DIR/configured" \
  npm run test:integration -- --coverage --coverage.reportsDirectory="$COVERAGE_DIR/configured" --coverage.reporter=json --testNamePattern="configured"

echo ""
echo "=== Phase 5: E2E - Interactive TTY ==="
mkdir -p "$V8_COVERAGE_DIR/e2e"
# Use GCD_V8_COVERAGE instead of NODE_V8_COVERAGE to avoid vitest writing coverage
# The e2e setup.ts forwards this to NODE_V8_COVERAGE only for CLI subprocesses
export GCD_V8_COVERAGE="$V8_COVERAGE_DIR/e2e"
USE_DIST=1 npm run test:e2e
unset GCD_V8_COVERAGE

echo ""
echo "=== Processing V8 Subprocess Coverage ==="
# Convert V8 coverage from each phase to Istanbul format
for phase in no-git no-config configured e2e; do
  if [ -d "$V8_COVERAGE_DIR/$phase" ] && [ "$(ls -A $V8_COVERAGE_DIR/$phase 2>/dev/null)" ]; then
    echo "Processing $phase subprocess coverage..."
    mkdir -p "$COVERAGE_DIR/v8-processed/$phase"
    npx c8 report \
      --temp-directory="$V8_COVERAGE_DIR/$phase" \
      --reporter=json \
      --reports-dir="$COVERAGE_DIR/v8-processed/$phase" \
      --src=dist \
      2>/dev/null || echo "  No subprocess coverage for $phase"
  fi
done

echo ""
echo "=== Merging Coverage Reports ==="
mkdir -p "$COVERAGE_DIR/.nyc_output"

# Collect vitest coverage files
cp "$COVERAGE_DIR/unit/coverage-final.json" "$COVERAGE_DIR/.nyc_output/unit.json" 2>/dev/null || true
cp "$COVERAGE_DIR/no-git/coverage-final.json" "$COVERAGE_DIR/.nyc_output/no-git.json" 2>/dev/null || true
cp "$COVERAGE_DIR/no-config/coverage-final.json" "$COVERAGE_DIR/.nyc_output/no-config.json" 2>/dev/null || true
cp "$COVERAGE_DIR/configured/coverage-final.json" "$COVERAGE_DIR/.nyc_output/configured.json" 2>/dev/null || true

# Collect V8 subprocess coverage files
cp "$COVERAGE_DIR/v8-processed/no-git/coverage-final.json" "$COVERAGE_DIR/.nyc_output/v8-no-git.json" 2>/dev/null || true
cp "$COVERAGE_DIR/v8-processed/no-config/coverage-final.json" "$COVERAGE_DIR/.nyc_output/v8-no-config.json" 2>/dev/null || true
cp "$COVERAGE_DIR/v8-processed/configured/coverage-final.json" "$COVERAGE_DIR/.nyc_output/v8-configured.json" 2>/dev/null || true
cp "$COVERAGE_DIR/v8-processed/e2e/coverage-final.json" "$COVERAGE_DIR/.nyc_output/v8-e2e.json" 2>/dev/null || true

# Merge and generate report
mkdir -p "$COVERAGE_DIR/merged"
npx nyc merge "$COVERAGE_DIR/.nyc_output" "$COVERAGE_DIR/merged/coverage.json"
npx nyc report --reporter=text --reporter=html --temp-dir="$COVERAGE_DIR/merged" --report-dir="$COVERAGE_DIR/merged"

echo ""
echo "=== Coverage Complete ==="
echo "Results in: $COVERAGE_DIR/merged"
