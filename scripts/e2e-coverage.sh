#!/bin/bash
set -e

COVERAGE_DIR="$(pwd)/coverage/e2e"
V8_COVERAGE_DIR="$COVERAGE_DIR/v8-subprocess"

echo "=== Cleaning previous coverage ==="
rm -rf "$COVERAGE_DIR"
mkdir -p "$V8_COVERAGE_DIR"

echo "=== Building ==="
npm run build

echo ""
echo "=== Running E2E Tests with V8 Coverage ==="
# Use GCD_V8_COVERAGE instead of NODE_V8_COVERAGE to avoid vitest writing coverage
# The e2e setup.ts forwards this to NODE_V8_COVERAGE only for CLI subprocesses
export GCD_V8_COVERAGE="$V8_COVERAGE_DIR"
export USE_DIST=1
npm run test:e2e
unset GCD_V8_COVERAGE USE_DIST

echo ""
echo "=== Processing V8 Subprocess Coverage ==="
if [ -d "$V8_COVERAGE_DIR" ] && [ "$(ls -A $V8_COVERAGE_DIR 2>/dev/null)" ]; then
  npx c8 report \
    --temp-directory="$V8_COVERAGE_DIR" \
    --reporter=text \
    --reporter=html \
    --reporter=json \
    --reports-dir="$COVERAGE_DIR" \
    --src=dist
else
  echo "No subprocess coverage data found"
fi

echo ""
echo "=== Coverage Complete ==="
echo "Results in: $COVERAGE_DIR"
