import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('Integration Tests', () => {
  beforeAll(() => {
    // Ensure CLI is built
    if (!existsSync(CLI_PATH)) {
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
    }

    // Create test directory
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    // Cleanup test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Git Repo Fixture', () => {
    beforeAll(() => {
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

    it('created test repo with commits', () => {
      const log = exec('git log --oneline');
      expect(log).toContain('feat: Add new feature PROJ-123');
      expect(log).toContain('fix: Fix bug PROJ-456');
      expect(log).toContain('chore: Update deps');
    });
  });

  describe('Full run with defaults', () => {
    it('generates all output files', () => {
      const result = exec(`node ${CLI_PATH}`);

      expect(result).toContain('git-cluster-duck');
      expect(result).toContain('feature/test');
      expect(result).toContain('main');
      expect(result).toContain('3 commit(s)');
      expect(result).toContain('PROJ-123');
      expect(result).toContain('PROJ-456');
      expect(result).toContain('Generated');
    });

    it('creates output directory with files', () => {
      // Find the temp/gcd directory
      const tempDir = join(TEST_DIR, 'temp', 'gcd');
      expect(existsSync(tempDir)).toBe(true);
    });
  });

  describe('--format flag', () => {
    it('generates only specified format', () => {
      const outputDir = join(TEST_DIR, 'format-test');
      const result = exec(`node ${CLI_PATH} --format raw-json --output ${outputDir}`);

      expect(result).toContain('Generated 1 file(s)');

      const jsonFile = join(outputDir, 'raw-json.json');
      expect(existsSync(jsonFile)).toBe(true);

      const content = JSON.parse(readFileSync(jsonFile, 'utf-8'));
      expect(content.commits).toHaveLength(3);
      expect(content.issues).toContain('PROJ-123');
    });

    it('generates multiple specified formats', () => {
      const outputDir = join(TEST_DIR, 'multi-format-test');
      const result = exec(`node ${CLI_PATH} --format raw-text,raw-json --output ${outputDir}`);

      expect(result).toContain('Generated 2 file(s)');
      expect(existsSync(join(outputDir, 'raw-text.txt'))).toBe(true);
      expect(existsSync(join(outputDir, 'raw-json.json'))).toBe(true);
    });

    it('errors on invalid format', () => {
      const { stderr, code } = execWithError(`node ${CLI_PATH} --format invalid-format`);

      expect(code).not.toBe(0);
      expect(stderr).toContain('Unknown format');
    });
  });

  describe('--stdout flag', () => {
    it('outputs to console instead of files', () => {
      const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);

      expect(result).toContain('"commits"');
      expect(result).toContain('PROJ-123');

      // Should be valid JSON in the output
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBe(null);

      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.commits).toBeDefined();
    });
  });

  describe('--no-issues flag', () => {
    it('skips issue extraction', () => {
      const result = exec(`node ${CLI_PATH} --format raw-json --stdout --no-issues`);

      // Parse the JSON from output
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch![0]);

      // Commits should have empty issues arrays
      expect(parsed.commits[0].issues).toEqual([]);
      expect(parsed.issues).toEqual([]);
    });
  });

  describe('--pattern flag', () => {
    it('uses custom pattern', () => {
      const result = exec(`node ${CLI_PATH} --format raw-json --stdout --pattern "PROJ-\\d+"`);

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch![0]);

      expect(parsed.issues).toContain('PROJ-123');
      expect(parsed.issues).toContain('PROJ-456');
    });
  });

  describe('Edge cases', () => {
    it('handles same branch comparison gracefully', () => {
      const result = exec(`node ${CLI_PATH} main main --stdout --format raw-text`);

      expect(result).toContain('No commits found');
    });

    it('handles branch with nested slashes', () => {
      // Create branch with nested slashes
      exec('git checkout -b feature/nested/deep/branch');
      writeFileSync(join(TEST_DIR, 'nested.ts'), 'export const nested = 1;');
      exec('git add .');
      exec('git commit -m "feat: Nested branch commit NEST-001"');

      const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);

      expect(result).toContain('feature/nested/deep/branch');
      expect(result).toContain('NEST-001');

      // Cleanup - go back to feature/test
      exec('git checkout feature/test');
    });

    it('handles unicode in commit messages', () => {
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

    it('handles very long commit messages', () => {
      exec('git checkout -b feature/long-message');
      writeFileSync(join(TEST_DIR, 'long.ts'), 'export const long = 1;');
      exec('git add .');

      const longBody = 'This is a very detailed description. '.repeat(50);
      exec(`git commit -m "feat: Long commit LONG-999" -m "${longBody}"`);

      const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch![0]);

      const longCommit = parsed.commits.find((c: { subject: string }) => c.subject.includes('LONG-999'));
      expect(longCommit).toBeDefined();
      expect(longCommit.body.length).toBeGreaterThan(500);

      exec('git checkout feature/test');
    });

    it('handles commit with no body', () => {
      const result = exec(`node ${CLI_PATH} --format raw-json --stdout`);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch![0]);

      // Our test commits have no body
      const noBodyCommit = parsed.commits.find((c: { subject: string }) => c.subject.includes('Update deps'));
      expect(noBodyCommit).toBeDefined();
      expect(noBodyCommit.body).toBe('');
    });
  });

  describe('Input Error Handlers', () => {
    it('errors on non-existent target branch', () => {
      const { stdout, stderr, code } = execWithError(`node ${CLI_PATH} nonexistent-branch main`);
      const output = stdout + stderr;

      // Should either error or show no commits
      expect(output).toMatch(/No commits found|error|fatal/i);
    });

    it('errors on non-existent base branch', () => {
      const { stdout, stderr, code } = execWithError(`node ${CLI_PATH} feature/test nonexistent-base`);
      const output = stdout + stderr;

      expect(output).toMatch(/No commits found|error|fatal/i);
    });

    it('handles empty pattern gracefully', () => {
      const { stdout, stderr } = execWithError(`node ${CLI_PATH} --pattern "" --stdout --format raw-json`);
      const output = stdout + stderr;

      // Should still work, just might not match anything
      expect(output).toContain('git-cluster-duck');
    });
  });

  // TODO: Convert integration tests to Docker with a pre-seeded git repo fixture
  // This would allow testing "outside git repo" scenario portably across platforms
});

describe('CLI Help', () => {
  it('--help shows usage', () => {
    const result = exec(`node ${CLI_PATH} --help`, process.cwd());

    expect(result).toContain('Usage:');
    expect(result).toContain('gcd');
  });

  it('--version shows version', () => {
    const result = exec(`node ${CLI_PATH} --version`, process.cwd());
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

    expect(result).toContain(pkg.version);
  });

  it('init --help shows init usage', () => {
    const result = exec(`node ${CLI_PATH} init --help`, process.cwd());

    expect(result).toContain('init');
    expect(result).toContain('config');
  });
});
