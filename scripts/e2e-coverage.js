#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const COVERAGE_DIR = join(process.cwd(), 'coverage', 'e2e');
const V8_COVERAGE_DIR = join(COVERAGE_DIR, 'v8-subprocess');

function run(cmd, env = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
}

console.log('=== Cleaning previous coverage ===');
rmSync(COVERAGE_DIR, { recursive: true, force: true });
mkdirSync(V8_COVERAGE_DIR, { recursive: true });

console.log('=== Building ===');
run('npm run build');

console.log('');
console.log('=== Running E2E Tests with V8 Coverage ===');
run('npm run test:e2e', {
  GCD_V8_COVERAGE: V8_COVERAGE_DIR,
  USE_DIST: '1'
});

console.log('');
console.log('=== Processing V8 Subprocess Coverage ===');
if (existsSync(V8_COVERAGE_DIR) && readdirSync(V8_COVERAGE_DIR).length > 0) {
  run(`npx c8 report --temp-directory="${V8_COVERAGE_DIR}" --reporter=text --reporter=html --reporter=json --reports-dir="${COVERAGE_DIR}" --src=dist`);
} else {
  console.log('No subprocess coverage data found');
}

console.log('');
console.log('=== Coverage Complete ===');
console.log(`Results in: ${COVERAGE_DIR}`);
