import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import {
  isGitInstalled,
  printNoGitError,
  isGitRepo,
  getCurrentBranch,
  detectBaseBranch,
  getCommitsBetween,
  getGitMeta,
  getRepoRoot,
} from '../git/index.js';
import {
  DEFAULT_PATTERN,
  extractIssuesFromCommits,
  getAllUniqueIssues,
  TicketPattern,
} from '../parsers/index.js';
import { loadConfig, printGitignoreWarning } from '../config/index.js';
import { FORMATTERS, ALL_FORMAT_NAMES, formatOutput, getExtension, FormatterContext } from '../formatters/index.js';

export interface RunOptions {
  format?: string;
  output?: string;
  stdout?: boolean;
  issues?: boolean;
  pattern?: string;
}

function resolveOutputDir(template: string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return template
    .replace(/\{date\}/g, date)
    .replace(/\{time\}/g, time);
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export async function runCommand(
  target: string | undefined,
  base: string | undefined,
  options: RunOptions
): Promise<void> {
  console.log(pc.bold('🦆 git-cluster-duck\n'));

  // Check if git is installed
  if (!isGitInstalled()) {
    printNoGitError();
    process.exit(1);
  }

  // Check if in git repo
  if (!isGitRepo()) {
    console.error(pc.red('✗ Not a git repository'));
    console.error(pc.dim('  Run this command from inside a git repository,'));
    console.error(pc.dim('  or run `git init` to create one.'));
    process.exit(1);
  }

  // Load config
  const config = loadConfig();

  // Resolve target branch
  const targetBranch = target || getCurrentBranch();
  if (!targetBranch) {
    console.error(pc.red('✗ Could not determine target branch'));
    process.exit(1);
  }

  // Resolve base branch (CLI > config > auto-detect)
  const baseBranch = base || config.baseBranch || detectBaseBranch();
  if (!baseBranch) {
    console.error(pc.red('✗ Could not detect base branch (main/master)'));
    process.exit(1);
  }

  console.log(`Comparing: ${pc.cyan(targetBranch)} → ${pc.cyan(baseBranch)}\n`);

  // Get commits
  let commits = getCommitsBetween(targetBranch, baseBranch);
  const meta = getGitMeta(targetBranch, baseBranch, commits);

  if (commits.length === 0) {
    console.log(pc.yellow('No commits found between branches.'));
    return;
  }

  // Extract issues (unless --no-issues flag)
  let patterns: TicketPattern[] = [];
  if (options.issues !== false) {
    if (options.pattern) {
      patterns.push({ name: 'custom', regex: options.pattern, enabled: true });
    } else if (config.ticketPatterns.length > 0) {
      patterns = config.ticketPatterns;
    } else {
      patterns.push(DEFAULT_PATTERN);
    }
    commits = extractIssuesFromCommits(commits, patterns);
  }

  const allIssues = getAllUniqueIssues(commits);

  console.log(`Found ${pc.bold(String(commits.length))} commit(s)`);
  if (allIssues.length > 0) {
    console.log(`Issues: ${allIssues.map((i) => pc.magenta(i)).join(', ')}`);
  }
  console.log('');

  // Prepare formatter context
  const ctx: FormatterContext = {
    commits,
    issues: allIssues,
    meta,
  };

  // Determine which formats to output
  let formats: string[];
  if (options.format) {
    formats = options.format.split(',').map((f) => f.trim());
    // Validate formats
    for (const f of formats) {
      if (!FORMATTERS[f]) {
        console.error(pc.red(`✗ Unknown format: ${f}`));
        console.error(pc.dim(`Available formats: ${ALL_FORMAT_NAMES.join(', ')}`));
        process.exit(1);
      }
    }
  } else if (config.defaultOutputs.includes('all')) {
    formats = ALL_FORMAT_NAMES;
  } else {
    formats = config.defaultOutputs;
  }

  // Handle stdout mode
  if (options.stdout) {
    for (const format of formats) {
      console.log(pc.dim(`\n=== ${format} ===\n`));
      console.log(formatOutput(format, ctx));
    }
    return;
  }

  // Resolve output directory
  const outputDirTemplate = options.output || config.outputDir;
  const outputDir = resolveOutputDir(outputDirTemplate);
  const fullOutputDir = outputDir.startsWith('/')
    ? outputDir
    : join(getRepoRoot(), outputDir);

  // Create output directory
  ensureDir(fullOutputDir);

  // Write all formats
  const writtenFiles: string[] = [];
  for (const format of formats) {
    const content = formatOutput(format, ctx);
    const ext = getExtension(format);
    const filename = `${format}.${ext}`;
    const filepath = join(fullOutputDir, filename);

    writeFileSync(filepath, content + '\n');
    writtenFiles.push(filename);
  }

  console.log(pc.green(`✓ Generated ${pc.bold(String(writtenFiles.length))} file(s) in ${pc.blue(outputDir + '/')}`));
  for (const file of writtenFiles) {
    console.log(pc.dim(`  - ${file}`));
  }

  // Check gitignore
  printGitignoreWarning(outputDirTemplate);
}
