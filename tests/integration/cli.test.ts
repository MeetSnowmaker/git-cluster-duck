import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DIR = join(tmpdir(), 'gcd-test-' + Date.now());
const CLI_PATH = join(process.cwd(), 'dist', 'index.js');

function exec(cmd: string, cwd: string = TEST_DIR): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return err.stdout || err.stderr || err.message || '';
  }
}

function execWithError(cmd: string, cwd: string = TEST_DIR): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return { stdout, stderr: '', code: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    return {
      stdout,
      stderr,
      code: err.status ?? 1,
    };
  }
}

function isGitInstalled(): boolean {
  try {
    execSync('git --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function isGitConfigured(): boolean {
  try {
    execSync('git config --global user.email', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Phase 1: No Git Installed
// Run with: --testNamePattern="no-git"
// =============================================================================

describe('[no-git] CLI without git installed', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('[no-git] shows error when git is not installed', () => {
    if (isGitInstalled()) {
      console.log('Skipping: git is already installed');
      return;
    }

    const { stdout, stderr } = execWithError(`node ${CLI_PATH}`);
    const output = stdout + stderr;

    expect(output).toMatch(/git|Quack/i);
  });

  it('[no-git] --help works without git', () => {
    const result = exec(`node ${CLI_PATH} --help`, process.cwd());

    expect(result).toContain('Usage:');
    expect(result).toContain('gcd');
  });

  it('[no-git] --version works without git', () => {
    const result = exec(`node ${CLI_PATH} --version`, process.cwd());
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

    expect(result).toContain(pkg.version);
  });
});

// =============================================================================
// Phase 2: Git Installed, No Config
// Run with: --testNamePattern="no-config"
// =============================================================================

describe('[no-config] CLI with git but no user config', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('[no-config] shows error when not in a git repo', () => {
    if (!isGitInstalled()) {
      console.log('Skipping: git not installed yet');
      return;
    }

    const nonGitDir = join(TEST_DIR, 'non-git');
    mkdirSync(nonGitDir, { recursive: true });

    const { stdout, stderr } = execWithError(`node ${CLI_PATH}`, nonGitDir);
    const output = stdout + stderr;

    expect(output).toMatch(/not a git repository|Quack/i);
  });

  it('[no-config] init command works without git config', () => {
    if (!isGitInstalled()) {
      console.log('Skipping: git not installed yet');
      return;
    }

    const result = exec(`node ${CLI_PATH} init --help`, process.cwd());

    expect(result).toContain('init');
  });

  it('[no-config] handles empty git repo (no commits)', () => {
    if (!isGitInstalled()) {
      console.log('Skipping: git not installed yet');
      return;
    }

    const emptyRepoDir = join(TEST_DIR, 'empty-repo');
    mkdirSync(emptyRepoDir, { recursive: true });
    execSync('git init', { cwd: emptyRepoDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: emptyRepoDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: emptyRepoDir, stdio: 'pipe' });

    const { stdout, stderr } = execWithError(`node ${CLI_PATH}`, emptyRepoDir);
    const output = stdout + stderr;

    // Should handle gracefully - either error or show no commits
    expect(output).toMatch(/No commits|error|fatal|HEAD/i);
  });
});

// =============================================================================
// Phase 3: Fully Configured
// Run with: --testNamePattern="configured"
// =============================================================================

describe('[configured] Full integration tests', () => {
  beforeAll(() => {
    if (!isGitInstalled() || !isGitConfigured()) {
      console.log('Skipping: git not fully configured');
      return;
    }

    // Ensure CLI is built
    if (!existsSync(CLI_PATH)) {
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
    }

    // Create test directory
    mkdirSync(TEST_DIR, { recursive: true });

    // Initialize git repo
    exec('git init');
    exec('git config user.email "test@test.com"');
    exec('git config user.name "Test User"');

    // Create initial commit on main
    writeFileSync(join(TEST_DIR, 'README.md'), '# Test');
    exec('git add .');
    exec('git commit -m "Initial commit"');
    exec('git branch -M main');

    // Create feature branch with commits
    exec('git checkout -b feature/test');

    writeFileSync(join(TEST_DIR, 'feature.ts'), 'export const x = 1;');
    exec('git add .');
    exec('git commit -m "feat: Add new feature PROJ-123"');

    writeFileSync(join(TEST_DIR, 'fix.ts'), 'export const y = 2;');
    exec('git add .');
    exec('git commit -m "fix: Fix bug PROJ-456"');

    writeFileSync(join(TEST_DIR, 'chore.ts'), 'export const z = 3;');
    exec('git add .');
    exec('git commit -m "chore: Update deps"');
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('[configured] creates test repo with commits', () => {
    if (!isGitConfigured()) return;

    const log = exec('git log --oneline');
    expect(log).toContain('feat: Add new feature PROJ-123');
    expect(log).toContain('fix: Fix bug PROJ-456');
    expect(log).toContain('chore: Update deps');
  });

  it('[configured] generates all output files with defaults', () => {
    if (!isGitConfigured()) return;

    const result = exec(`node ${CLI_PATH}`);

    expect(result).toContain('git-cluster-duck');
    expect(result).toContain('feature/test');
    expect(result).toContain('main');
    expect(result).toContain('3 commit(s)');
    expect(result).toContain('PROJ-123');
    expect(result).toContain('PROJ-456');
    expect(result).toContain('Generated');
  });

  it('[configured] creates output directory with files', () => {
    if (!isGitConfigured()) return;

    const tempDir = join(TEST_DIR, 'temp', 'gcd');
    expect(existsSync(tempDir)).toBe(true);
  });

  it('[configured] --format generates only specified format', () => {
    if (!isGitConfigured()) return;

    const outputDir = join(TEST_DIR, 'format-test');
    const result = exec(`node ${CLI_PATH} --format raw-json --output ${outputDir}`);

    expect(result).toContain('Generated 1 file(s)');

    const jsonFile = join(outputDir, 'raw-json.json');
    expect(existsSync(jsonFile)).toBe(true);

    const content = JSON.parse(readFileSync(jsonFile, 'utf-8'));
    expect(content.commits).toHaveLength(3);
    expect(content.issues).toContain('PROJ-123');
  });

  it('[configured] --format generates multiple formats', () => {
    if (!isGitConfigured()) return;

    const outputDir = join(TEST_DIR, 'multi-format-test');
    const result = exec(`node ${CLI_PATH} --format raw-text,raw-json --output ${outputDir}`);

    expect(result).toContain('Generated 2 file(s)');
    expect(existsSync(join(outputDir, 'raw-text.txt'))).toBe(true);
    expect(existsSync(join(outputDir, 'raw-json.json'))).toBe(true);
  });

  it('[configured] --format errors on invalid format', () => {
    if (!isGitConfigured()) return;

    const { stderr, code } = execWithError(`node ${CLI_PATH} --format invalid-format`);

    expect(code).not.toBe(0);
    expect(stderr).toContain('Unknown format');
  });

  it('[configured] --stdout outputs to console', () => {
    if (!isGitConfigured()) return;

    const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);

    expect(result).toContain('"commits"');
    expect(result).toContain('PROJ-123');

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBe(null);

    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.commits).toBeDefined();
  });

  it('[configured] --no-issues skips issue extraction', () => {
    if (!isGitConfigured()) return;

    const result = exec(`node ${CLI_PATH} --format raw-json --stdout --no-issues`);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch![0]);

    expect(parsed.commits[0].issues).toEqual([]);
    expect(parsed.issues).toEqual([]);
  });

  it('[configured] --pattern uses custom pattern', () => {
    if (!isGitConfigured()) return;

    const result = exec(`node ${CLI_PATH} --format raw-json --stdout --pattern "PROJ-\\d+"`);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch![0]);

    expect(parsed.issues).toContain('PROJ-123');
    expect(parsed.issues).toContain('PROJ-456');
  });

  it('[configured] handles same branch comparison', () => {
    if (!isGitConfigured()) return;

    const result = exec(`node ${CLI_PATH} main main --stdout --format raw-text`);

    expect(result).toContain('No commits found');
  });

  it('[configured] handles branch with nested slashes', () => {
    if (!isGitConfigured()) return;

    exec('git checkout -b feature/nested/deep/branch');
    writeFileSync(join(TEST_DIR, 'nested.ts'), 'export const nested = 1;');
    exec('git add .');
    exec('git commit -m "feat: Nested branch commit NEST-001"');

    const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);

    expect(result).toContain('feature/nested/deep/branch');
    expect(result).toContain('NEST-001');

    exec('git checkout feature/test');
  });

  it('[configured] handles unicode in commit messages', () => {
    if (!isGitConfigured()) return;

    exec('git checkout -b feature/unicode-test');
    writeFileSync(join(TEST_DIR, 'unicode.ts'), 'export const emoji = "🦆";');
    exec('git add .');
    exec('git commit -m "feat: Add emoji support 🦆 EMOJI-123"');

    const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch![0]);

    const unicodeCommit = parsed.commits.find((c: { subject: string }) => c.subject.includes('emoji'));
    expect(unicodeCommit).toBeDefined();
    expect(unicodeCommit.subject).toContain('🦆');
    expect(parsed.issues).toContain('EMOJI-123');

    exec('git checkout feature/test');
  });

  it('[configured] handles commit with no body', () => {
    if (!isGitConfigured()) return;

    const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch![0]);

    const noBodyCommit = parsed.commits.find((c: { subject: string }) => c.subject.includes('Update deps'));
    expect(noBodyCommit).toBeDefined();
    expect(noBodyCommit.body).toBe('');
  });

  it('[configured] errors on non-existent target branch', () => {
    if (!isGitConfigured()) return;

    const { stdout, stderr } = execWithError(`node ${CLI_PATH} nonexistent-branch main`);
    const output = stdout + stderr;

    expect(output).toMatch(/No commits found|error|fatal/i);
  });

  it('[configured] errors on non-existent base branch', () => {
    if (!isGitConfigured()) return;

    const { stdout, stderr } = execWithError(`node ${CLI_PATH} feature/test nonexistent-base`);
    const output = stdout + stderr;

    expect(output).toMatch(/No commits found|error|fatal/i);
  });

  it('[configured] positional base branch argument works', () => {
    if (!isGitConfigured()) return;

    // Create a second base branch to test positional base argument
    exec('git checkout main');
    exec('git checkout -b develop');
    writeFileSync(join(TEST_DIR, 'develop.ts'), 'export const dev = 1;');
    exec('git add .');
    exec('git commit -m "chore: Develop commit"');
    exec('git checkout feature/test');

    // CLI syntax: gcd [target] [base]
    const result = exec(`node ${CLI_PATH} feature/test develop --format raw-json --stdout`);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBe(null);
    const parsed = JSON.parse(jsonMatch![0]);

    expect(parsed.meta.baseBranch).toBe('develop');
  });

  it('[configured] handles commit with multi-line body', () => {
    if (!isGitConfigured()) return;

    exec('git checkout -b feature/multiline-body');
    writeFileSync(join(TEST_DIR, 'multiline.ts'), 'export const m = 1;');
    exec('git add .');

    const body = 'This is line one.\\n\\nThis is line two.\\n\\n- Bullet point\\n- Another bullet';
    exec(`git commit -m "feat: Multi-line body MULTI-001" -m "${body}"`);

    const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch![0]);

    const multiCommit = parsed.commits.find((c: { subject: string }) => c.subject.includes('MULTI-001'));
    expect(multiCommit).toBeDefined();
    expect(multiCommit.body.length).toBeGreaterThan(0);
    expect(parsed.issues).toContain('MULTI-001');

    exec('git checkout feature/test');
  });

  it('[configured] handles multiple issues in single commit', () => {
    if (!isGitConfigured()) return;

    exec('git checkout -b feature/multi-issue');
    writeFileSync(join(TEST_DIR, 'multi-issue.ts'), 'export const mi = 1;');
    exec('git add .');
    exec('git commit -m "fix: Resolve ISSUE-001 ISSUE-002 ISSUE-003"');

    const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch![0]);

    expect(parsed.issues).toContain('ISSUE-001');
    expect(parsed.issues).toContain('ISSUE-002');
    expect(parsed.issues).toContain('ISSUE-003');

    const multiIssueCommit = parsed.commits.find((c: { subject: string }) => c.subject.includes('ISSUE-001'));
    expect(multiIssueCommit.issues).toContain('ISSUE-001');
    expect(multiIssueCommit.issues).toContain('ISSUE-002');
    expect(multiIssueCommit.issues).toContain('ISSUE-003');

    exec('git checkout feature/test');
  });

  it('[configured] loads config from .gcdrc.json', () => {
    if (!isGitConfigured()) return;

    // Create config file with custom pattern
    const configContent = JSON.stringify({
      patterns: ['CUSTOM-\\d+'],
      formats: ['raw-json'],
    }, null, 2);
    writeFileSync(join(TEST_DIR, '.gcdrc.json'), configContent);

    exec('git checkout -b feature/custom-config');
    writeFileSync(join(TEST_DIR, 'custom.ts'), 'export const custom = 1;');
    exec('git add .');
    exec('git commit -m "feat: Custom pattern CUSTOM-999"');

    const result = exec(`node ${CLI_PATH} --stdout`);

    expect(result).toContain('CUSTOM-999');

    // Cleanup
    rmSync(join(TEST_DIR, '.gcdrc.json'));
    exec('git checkout feature/test');
  });

  it('[configured] generates all 15 format types', () => {
    if (!isGitConfigured()) return;

    const formats = [
      'raw-text', 'raw-json', 'raw-md',
      'concat-text', 'concat-json', 'concat-md',
      'summary-text', 'summary-json', 'summary-md',
      'verbose-text', 'verbose-json', 'verbose-md',
      'issues-text', 'issues-json', 'issues-md',
    ];

    const outputDir = join(TEST_DIR, 'all-formats');
    const result = exec(`node ${CLI_PATH} --format ${formats.join(',')} --output ${outputDir}`);

    expect(result).toContain('Generated 15 file(s)');

    // Verify each file exists
    for (const format of formats) {
      const ext = format.endsWith('-json') ? 'json' : format.endsWith('-md') ? 'md' : 'txt';
      const filePath = join(outputDir, `${format}.${ext}`);
      expect(existsSync(filePath)).toBe(true);
    }
  });
});
