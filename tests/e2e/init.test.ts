import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from 'cli-testing-library';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TestContext,
  createTestContext,
  createGlobalConfig,
  cleanupOrphanedDirs,
  CLI_RUNNER,
  CLI_ENTRY,
} from './setup.js';

// Helper to add small delay for prompt rendering
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Store render instances for graceful cleanup (allows V8 coverage to be written)
const instances: Array<Awaited<ReturnType<typeof render>>> = [];

describe('e2e: init command', () => {
  let ctx: TestContext;

  // Clean up any orphaned temp dirs from previous crashed runs
  beforeAll(() => {
    cleanupOrphanedDirs();
  });

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(async () => {
    // Wait for processes to exit naturally (allows V8 to write coverage)
    // SIGKILL (used by default cleanup) doesn't allow coverage to be written
    for (const instance of instances) {
      // Wait up to 2 seconds for natural exit
      const timeout = Date.now() + 2000;
      while (instance.hasExit() === null && Date.now() < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      // If still running, send SIGTERM
      if (instance.hasExit() === null) {
        await fireEvent.sigterm(instance);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    instances.length = 0;
    await cleanup();
    ctx.cleanup();
  });

  describe('accept all defaults', () => {
    it('creates global config with default values', async () => {
      const instance = await render(CLI_RUNNER, [CLI_ENTRY, 'init'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText, userEvent } = instance;

      // Wait for init to start
      await findByText('git-cluster-duck init');

      // Repository name prompt - accept default, wait for confirmation
      await findByText('Repository name');
      await delay(100);
      userEvent.keyboard('[Enter]');
      await findByText('Repository name:');

      // Base branch prompt - accept default
      await findByText('Base branch');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Wait a bit for checkbox to render
      await delay(200);

      // Ticket patterns - checkbox uses different rendering
      // Just select first and confirm
      userEvent.keyboard('[Space]');
      await delay(50);
      userEvent.keyboard('[Enter]');

      // Add custom pattern prompt - default is No
      await findByText('custom regex pattern');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Use all outputs prompt - default is Yes
      await findByText('output formats');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Output directory prompt - accept default
      await findByText('Output directory');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Wait for completion
      await findByText('Ready!');

      // Verify config was created
      const configPath = join(ctx.home, '.config', 'git-cluster-duck', 'repo.json');
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.repoName).toBe('repo');
      expect(config.baseBranch).toBe('main');
      expect(config.defaultOutputs).toContain('all');
      expect(config.ticketPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('--local flag', () => {
    it('creates local config file instead of global', async () => {
      const instance = await render(CLI_RUNNER, [CLI_ENTRY, 'init', '--local'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText, userEvent } = instance;

      await findByText('git-cluster-duck init');

      // Accept all defaults with delays
      await findByText('Repository name');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Base branch');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await delay(200);
      userEvent.keyboard('[Space][Enter]'); // Select pattern and confirm

      await findByText('custom regex pattern');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('output formats');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Output directory');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Ready!');

      // Local config should exist
      const localConfigPath = join(ctx.cwd, '.git-cluster-duck.json');
      expect(existsSync(localConfigPath)).toBe(true);

      // Global config should NOT exist
      const globalConfigPath = join(ctx.home, '.config', 'git-cluster-duck', 'repo.json');
      expect(existsSync(globalConfigPath)).toBe(false);
    });
  });

  describe('--force flag', () => {
    it('overwrites existing config without prompting', async () => {
      // Create existing global config
      createGlobalConfig(ctx, {
        repoName: 'old-name',
        baseBranch: 'old-branch',
        defaultOutputs: ['raw-text'],
        ticketPatterns: [],
        outputDir: './old-output',
        excludeAuthors: [],
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const instance = await render(CLI_RUNNER, [CLI_ENTRY, 'init', '--force'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText, userEvent } = instance;

      await findByText('git-cluster-duck init');

      // Should NOT see overwrite prompt, go straight to repo name
      await findByText('Repository name');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Base branch');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await delay(200);
      userEvent.keyboard('[Space][Enter]');

      await findByText('custom regex pattern');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('output formats');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Output directory');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Ready!');

      // Verify config was overwritten
      const configPath = join(ctx.home, '.config', 'git-cluster-duck', 'repo.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.repoName).toBe('repo'); // New name, not 'old-name'
    });
  });

  describe('custom regex pattern', () => {
    it('adds custom pattern when user provides one', async () => {
      const instance = await render(CLI_RUNNER, [CLI_ENTRY, 'init'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText, userEvent } = instance;

      await findByText('git-cluster-duck init');

      // Repository name - accept default
      await findByText('Repository name');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Base branch - accept default
      await findByText('Base branch');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Select ticket pattern
      await delay(200);
      userEvent.keyboard('[Space][Enter]');

      // Add custom pattern - say YES
      await findByText('custom regex pattern');
      await delay(100);
      userEvent.keyboard('y[Enter]');

      // Enter custom pattern (use simple literal pattern to avoid keyboard escaping issues)
      await findByText('Custom regex pattern');
      await delay(100);
      userEvent.keyboard('MYPROJ-[Enter]');

      // Use all outputs - accept default (yes)
      await findByText('output formats');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Output directory - accept default
      await findByText('Output directory');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Ready!');

      // Verify custom pattern was added
      const configPath = join(ctx.home, '.config', 'git-cluster-duck', 'repo.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      const customPattern = config.ticketPatterns.find((p: { name: string }) => p.name === 'custom');
      expect(customPattern).toBeDefined();
      expect(customPattern.regex).toBe('MYPROJ-');
    });
  });

  describe('specific output formats', () => {
    it('allows selecting specific output formats instead of all', async () => {
      const instance = await render(CLI_RUNNER, [CLI_ENTRY, 'init'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText, userEvent } = instance;

      await findByText('git-cluster-duck init');

      // Repository name - accept default
      await findByText('Repository name');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Base branch - accept default
      await findByText('Base branch');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Select ticket pattern
      await delay(200);
      userEvent.keyboard('[Space][Enter]');

      // Add custom pattern - say NO (default)
      await findByText('custom regex pattern');
      await delay(100);
      userEvent.keyboard('[Enter]');

      // Use all outputs - say NO
      await findByText('output formats');
      await delay(100);
      userEvent.keyboard('n[Enter]');

      // Select specific formats - select first two (raw-text, raw-json)
      await findByText('Select output formats');
      await delay(200);
      userEvent.keyboard('[Space]'); // Select first
      await delay(50);
      userEvent.keyboard('[ArrowDown][Space]'); // Move down and select second
      await delay(50);
      userEvent.keyboard('[Enter]'); // Confirm

      // Output directory - accept default
      await findByText('Output directory');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Ready!');

      // Verify specific outputs were saved
      const configPath = join(ctx.home, '.config', 'git-cluster-duck', 'repo.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      expect(config.defaultOutputs).not.toContain('all');
      expect(config.defaultOutputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('config already exists', () => {
    it('prompts for overwrite confirmation and aborts on decline', async () => {
      // Create existing global config
      createGlobalConfig(ctx, {
        repoName: 'existing-repo',
        baseBranch: 'main',
        defaultOutputs: ['all'],
        ticketPatterns: [],
        outputDir: './output',
        excludeAuthors: [],
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const instance = await render(CLI_RUNNER, [CLI_ENTRY, 'init'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText, userEvent } = instance;

      await findByText('git-cluster-duck init');

      // Should see overwrite prompt
      await findByText('Overwrite?');
      await delay(100);

      // Decline overwrite (default is No)
      userEvent.keyboard('[Enter]');

      // Should abort
      await findByText('Aborted');
    });

    it('overwrites when user confirms', async () => {
      // Create existing global config
      createGlobalConfig(ctx, {
        repoName: 'existing-repo',
        baseBranch: 'main',
        defaultOutputs: ['all'],
        ticketPatterns: [],
        outputDir: './output',
        excludeAuthors: [],
        excludePatterns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const instance = await render(CLI_RUNNER, [CLI_ENTRY, 'init'], {
        cwd: ctx.cwd,
        spawnOpts: { env: ctx.env },
      });
      instances.push(instance);
      const { findByText, userEvent } = instance;

      await findByText('git-cluster-duck init');

      // Should see overwrite prompt
      await findByText('Overwrite?');
      await delay(100);

      // Confirm overwrite
      userEvent.keyboard('y[Enter]');

      // Continue with init
      await findByText('Repository name');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Base branch');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await delay(200);
      userEvent.keyboard('[Space][Enter]');

      await findByText('custom regex pattern');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('output formats');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Output directory');
      await delay(100);
      userEvent.keyboard('[Enter]');

      await findByText('Ready!');

      // Verify config was overwritten
      const configPath = join(ctx.home, '.config', 'git-cluster-duck', 'repo.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.repoName).toBe('repo');
    });
  });
});
