#!/bin/bash
set -e

echo "=== Building TypeScript (dev mode) ==="
npm run build

echo ""
echo "=== Running Tests ==="
# Pass through any arguments to the test script
if [ "$1" = "coverage" ]; then
  shift
  exec bash scripts/docker-test-coverage.sh "$@"
else
  exec bash scripts/docker-test.sh "$@"
fi
