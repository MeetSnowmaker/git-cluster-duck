import { mkdtempSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Cleans up any leftover temp directories from previous test runs.
 * Call this in globalSetup or at the start of the test suite.
 */
export function cleanupOrphanedDirs(): void {
  const tmp = tmpdir();
  try {
    const entries = readdirSync(tmp);
    for (const entry of entries) {
      if (entry.startsWith('gcd-e2e-')) {
        try {
          rmSync(join(tmp, entry), { recursive: true, force: true });
        } catch {
          // Ignore errors
        }
      }
    }
  } catch {
    // Ignore errors
  }
}

export interface TestContext {
  /** Working directory for the test (git repo) */
  cwd: string;
  /** Isolated HOME directory for global config */
  home: string;
  /** Root temp directory (parent of cwd and home) */
  root: string;
  /** Environment variables with isolated HOME */
  env: NodeJS.ProcessEnv;
  /** Cleanup function */
  cleanup: () => void;
}

/**
 * Creates an isolated test context with:
 * - A temp directory as cwd with git repo initialized
 * - An isolated HOME directory for global config
 * - Environment variables with HOME overridden
 */
export function createTestContext(): TestContext {
  // Create root temp directory
  const root = mkdtempSync(join(tmpdir(), 'gcd-e2e-'));

  // Create cwd (git repo) and home directories
  const cwd = join(root, 'repo');
  const home = join(root, 'home');

  mkdirSync(cwd);
  mkdirSync(home);

  // Initialize git repo
  execSync('git init', { cwd, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', { cwd, stdio: 'ignore' });
  execSync('git config user.name "Test User"', { cwd, stdio: 'ignore' });

  // Create an initial commit (required for branch detection)
  execSync('git commit --allow-empty -m "Initial commit"', { cwd, stdio: 'ignore' });

  // Environment with isolated HOME
  // Also forward NODE_V8_COVERAGE if set, for subprocess coverage collection
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    // Also set XDG_CONFIG_HOME for Linux compatibility
    XDG_CONFIG_HOME: join(home, '.config'),
  };

  // For subprocess coverage: if GCD_V8_COVERAGE is set, use it for NODE_V8_COVERAGE
  // This allows collecting coverage from CLI subprocesses without vitest interference
  if (process.env.GCD_V8_COVERAGE) {
    env.NODE_V8_COVERAGE = process.env.GCD_V8_COVERAGE;
  }

  const cleanup = () => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  return { cwd, home, root, env, cleanup };
}

/**
 * Creates a global config file in the test context
 */
export function createGlobalConfig(ctx: TestContext, config: object): void {
  const configDir = join(ctx.home, '.config', 'git-cluster-duck');
  mkdirSync(configDir, { recursive: true });

  const repoName = 'repo'; // matches the cwd directory name
  const configPath = join(configDir, `${repoName}.json`);

  const { writeFileSync } = require('node:fs');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Creates a local config file in the test context
 */
export function createLocalConfig(ctx: TestContext, config: object): void {
  const configPath = join(ctx.cwd, '.git-cluster-duck.json');

  const { writeFileSync } = require('node:fs');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Path to the CLI entry point.
 * Uses tsx + source for watch mode compatibility.
 * Set USE_DIST=1 to use compiled version (for CI/coverage).
 */
export const USE_DIST = process.env.USE_DIST === '1';
export const CLI_ENTRY = USE_DIST
  ? join(process.cwd(), 'dist', 'index.js')
  : join(process.cwd(), 'src', 'index.ts');
export const CLI_RUNNER = USE_DIST ? 'node' : 'tsx';
