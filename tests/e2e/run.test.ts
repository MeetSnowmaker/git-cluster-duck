import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from 'cli-testing-library';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  TestContext,
  createTestContext,
  createGlobalConfig,
  cleanupOrphanedDirs,
  CLI_RUNNER,
  CLI_ENTRY,
} from './setup.js';

// Store render instances for graceful cleanup
const instances: Array<Awaited<ReturnType<typeof render>>> = [];

describe('e2e: run command', () => {
  let ctx: TestContext;

  beforeAll(() => {
    cleanupOrphanedDirs();
  });

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(async () => {
    for (const instance of instances) {
      const timeout = Date.now() + 2000;
      while (instance.hasExit() === null && Date.now() < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (instance.hasExit() === null) {
        await fireEvent.sigterm(instance);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    instances.length = 0;
    await cleanup();
    ctx?.cleanup();
  });

  /**
   * Helper to create commits in the test repo
   */
  function createCommit(message: string): void {
    execSync(`git commit --allow-empty -m "${message}"`, { cwd: ctx.cwd, stdio: 'ignore' });
  }

  /**
   * Helper to create a feature branch with commits
   */
  function createFeatureBranch(branchName: string, commits: string[]): void {
    execSync(`git checkout -b ${branchName}`, { cwd: ctx.cwd, stdio: 'ignore' });
    for (const message of commits) {
      createCommit(message);
    }
  }

  describe('basic run', () => {
    it('generates output files from commits with ticket references', async () => {
      // Setup: create config
      createGlobalConfig(ctx, {
        repoName: 'repo',
        baseBranch: 'main',
        defaultOutputs: ['raw-text', 'raw-json'],
        ticketPatterns: [{ name: 'jira', regex: '[A-Z]+-\\d+', enabled: true }],
        outputDir: './output',
        excludeAuthors: [],
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create feature branch with commits containing ticket refs
      createFeatureBranch('feature/PROJ-123-new-feature', [
        'feat: PROJ-123 add new button component',
        'fix: PROJ-456 resolve click handler issue',
        'chore: update dependencies',
      ]);

      // Run CLI
      const instance = await render(CLI_RUNNER, [CLI_ENTRY], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText } = instance;

      // Wait for completion
      await findByText('Generated');

      // Verify output files exist
      const outputDir = join(ctx.cwd, 'output');
      expect(existsSync(join(outputDir, 'raw-text.txt'))).toBe(true);
      expect(existsSync(join(outputDir, 'raw-json.json'))).toBe(true);

      // Verify content includes ticket references
      const rawText = readFileSync(join(outputDir, 'raw-text.txt'), 'utf-8');
      expect(rawText).toContain('PROJ-123');
      expect(rawText).toContain('PROJ-456');

      // Verify JSON structure
      const rawJson = JSON.parse(readFileSync(join(outputDir, 'raw-json.json'), 'utf-8'));
      expect(rawJson.commits).toHaveLength(3);
      expect(rawJson.meta.targetBranch).toBe('feature/PROJ-123-new-feature');
      expect(rawJson.meta.baseBranch).toBe('main');
    });

    it('outputs to stdout with --stdout flag', async () => {
      createGlobalConfig(ctx, {
        repoName: 'repo',
        baseBranch: 'main',
        defaultOutputs: ['raw-text'],
        ticketPatterns: [{ name: 'jira', regex: '[A-Z]+-\\d+', enabled: true }],
        outputDir: './output',
        excludeAuthors: [],
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      createFeatureBranch('feature/TEST-100', [
        'feat: TEST-100 implement feature',
      ]);

      const instance = await render(CLI_RUNNER, [CLI_ENTRY, '--stdout'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText } = instance;

      // Should output commit info to stdout
      await findByText('TEST-100');

      // No output files should be created
      const outputDir = join(ctx.cwd, 'output');
      expect(existsSync(outputDir)).toBe(false);
    });

    it('uses specified format with --format flag', async () => {
      createGlobalConfig(ctx, {
        repoName: 'repo',
        baseBranch: 'main',
        defaultOutputs: ['all'],
        ticketPatterns: [{ name: 'jira', regex: '[A-Z]+-\\d+', enabled: true }],
        outputDir: './output',
        excludeAuthors: [],
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      createFeatureBranch('feature/ABC-999', [
        'feat: ABC-999 add feature',
      ]);

      const instance = await render(CLI_RUNNER, [CLI_ENTRY, '--format', 'summary-text'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText } = instance;

      await findByText('Generated');

      // Only summary-text should exist
      const outputDir = join(ctx.cwd, 'output');
      expect(existsSync(join(outputDir, 'summary-text.txt'))).toBe(true);
      expect(existsSync(join(outputDir, 'raw-text.txt'))).toBe(false);

      const summary = readFileSync(join(outputDir, 'summary-text.txt'), 'utf-8');
      expect(summary).toContain('ABC-999');
    });
  });

  describe('issue extraction', () => {
    it('extracts issues from commit messages into commits array', async () => {
      createGlobalConfig(ctx, {
        repoName: 'repo',
        baseBranch: 'main',
        defaultOutputs: ['raw-json'],
        ticketPatterns: [{ name: 'jira', regex: '[A-Z]+-\\d+', enabled: true }],
        outputDir: './output',
        excludeAuthors: [],
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Commits have different issues
      createFeatureBranch('feature/issue-test', [
        'feat: FEAT-001 main implementation',
        'fix: BUG-002 fix edge case',
      ]);

      const instance = await render(CLI_RUNNER, [CLI_ENTRY], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText } = instance;

      await findByText('Generated');

      const rawJson = JSON.parse(
        readFileSync(join(ctx.cwd, 'output', 'raw-json.json'), 'utf-8')
      );

      // Commits are in reverse chronological order (newest first)
      // So commit[0] is "BUG-002", commit[1] is "FEAT-001"
      const allIssues = rawJson.commits.flatMap((c: { issues: string[] }) => c.issues);
      expect(allIssues).toContain('FEAT-001');
      expect(allIssues).toContain('BUG-002');
    });

    it('skips issue extraction with --no-issues flag', async () => {
      createGlobalConfig(ctx, {
        repoName: 'repo',
        baseBranch: 'main',
        defaultOutputs: ['raw-json'],
        ticketPatterns: [{ name: 'jira', regex: '[A-Z]+-\\d+', enabled: true }],
        outputDir: './output',
        excludeAuthors: [],
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      createFeatureBranch('feature/SKIP-123', [
        'feat: SKIP-123 some feature',
      ]);

      const instance = await render(CLI_RUNNER, [CLI_ENTRY, '--no-issues'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText } = instance;

      await findByText('Generated');

      const rawJson = JSON.parse(
        readFileSync(join(ctx.cwd, 'output', 'raw-json.json'), 'utf-8')
      );

      // Commits should have empty issues arrays
      expect(rawJson.commits[0].issues).toEqual([]);
    });
  });
});
