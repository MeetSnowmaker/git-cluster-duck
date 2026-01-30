import { input, confirm, checkbox } from '@inquirer/prompts';
import { isGitInstalled, isGitVersionSupported, printNoGitError, printGitVersionError, isGitRepo, getRepoName, detectBaseBranch } from '../git/index.js';
import {
  Config,
  DEFAULT_CONFIG,
  OUTPUT_FORMATS,
  createDefaultConfig,
  saveConfig,
  globalConfigExists,
  localConfigExists,
  printGitignoreWarning,
} from '../config/index.js';
import { PREDEFINED_PATTERNS, TicketPattern } from '../parsers/index.js';

export interface InitOptions {
  global?: boolean;
  local?: boolean;
  force?: boolean;
}

const PATTERN_CHOICES = [
  { name: 'Jira / Default (ABC-123)', value: 'jira' },
  { name: 'GitHub (#123)', value: 'github' },
  { name: 'GitLab (!123)', value: 'gitlab' },
  { name: 'Azure DevOps (AB#123)', value: 'azure' },
  { name: 'Linear (ENG-123)', value: 'linear' },
  { name: 'Pivotal Tracker (#12345678)', value: 'pivotal' },
  { name: 'Shorthand - Jira + GitHub', value: 'shorthand' },
];

const OUTPUT_CHOICES = [
  { name: '── Raw ──', value: '_separator1', disabled: true },
  { name: 'raw-text - Raw text git history', value: 'raw-text' },
  { name: 'raw-json - Raw JSON git history', value: 'raw-json' },
  { name: 'raw-md - Raw Markdown git history', value: 'raw-md' },
  { name: '── Concat ──', value: '_separator2', disabled: true },
  { name: 'concat-text - First line + issues (text)', value: 'concat-text' },
  { name: 'concat-json - First line + issues (JSON)', value: 'concat-json' },
  { name: 'concat-md - First line + issues (Markdown)', value: 'concat-md' },
  { name: '── Issues ──', value: '_separator3', disabled: true },
  { name: 'issues-text - Issue list (text)', value: 'issues-text' },
  { name: 'issues-json - Issue list (JSON)', value: 'issues-json' },
  { name: 'issues-md - Issue list (Markdown)', value: 'issues-md' },
  { name: '── Summary ──', value: '_separator4', disabled: true },
  { name: 'summary-text - Grouped by issue (text)', value: 'summary-text' },
  { name: 'summary-json - Grouped by issue (JSON)', value: 'summary-json' },
  { name: 'summary-md - Grouped by issue (Markdown)', value: 'summary-md' },
  { name: '── Verbose ──', value: '_separator5', disabled: true },
  { name: 'verbose-text - Full commits per issue (text)', value: 'verbose-text' },
  { name: 'verbose-json - Full commits per issue (JSON)', value: 'verbose-json' },
  { name: 'verbose-md - Full commits per issue (Markdown)', value: 'verbose-md' },
];

export async function initCommand(options: InitOptions): Promise<void> {
  console.log('🦆 git-cluster-duck init\n');

  // Check if git is installed
  if (!isGitInstalled()) {
    printNoGitError();
    process.exit(1);
  }

  // Check git version
  if (!isGitVersionSupported()) {
    printGitVersionError();
    process.exit(1);
  }

  // Check if in git repo
  if (!isGitRepo()) {
    console.error('✗ Not a git repository');
    console.error('  Run this command from inside a git repository,');
    console.error('  or run `git init` to create one.');
    process.exit(1);
  }

  // Determine target (global by default, local if --local)
  const target = options.local ? 'local' : 'global';

  // Check if config already exists
  const exists = target === 'local' ? localConfigExists() : globalConfigExists();
  if (exists && !options.force) {
    const overwrite = await confirm({
      message: `Config already exists. Overwrite?`,
      default: false,
    });
    if (!overwrite) {
      console.log('Aborted.');
      return;
    }
  }

  // Detect defaults
  const detectedRepoName = getRepoName();
  const detectedBaseBranch = detectBaseBranch();

  console.log(`Detected repo: ${detectedRepoName}`);
  console.log(`Detected base branch: ${detectedBaseBranch || 'none'}\n`);

  // Interactive prompts
  const repoName = await input({
    message: 'Repository name:',
    default: detectedRepoName,
  });

  const baseBranch = await input({
    message: 'Base branch:',
    default: detectedBaseBranch || 'main',
  });

  const selectedPatterns = await checkbox({
    message: 'Select ticket patterns:',
    choices: PATTERN_CHOICES,
    required: true,
  });

  // Ask for custom pattern
  const addCustom = await confirm({
    message: 'Add a custom regex pattern?',
    default: false,
  });

  let customPattern: string | null = null;
  if (addCustom) {
    customPattern = await input({
      message: 'Custom regex pattern:',
    });
  }

  // Output format selection
  const useAllOutputs = await confirm({
    message: 'Use all output formats?',
    default: true,
  });

  let selectedOutputs: string[] = ['all'];
  if (!useAllOutputs) {
    selectedOutputs = await checkbox({
      message: 'Select output formats:',
      choices: OUTPUT_CHOICES.filter((c) => !c.disabled),
      required: true,
    });
  }

  const outputDir = await input({
    message: 'Output directory:',
    default: DEFAULT_CONFIG.outputDir,
  });

  // Build ticket patterns
  const ticketPatterns: TicketPattern[] = selectedPatterns.map((name) => ({
    name,
    regex: PREDEFINED_PATTERNS[name],
    enabled: true,
  }));

  if (customPattern) {
    ticketPatterns.push({
      name: 'custom',
      regex: customPattern,
      enabled: true,
    });
  }

  // Create config
  const now = new Date().toISOString();
  const config: Config = {
    repoName,
    baseBranch,
    defaultOutputs: selectedOutputs,
    ticketPatterns,
    outputDir,
    excludeAuthors: [],
    excludePatterns: [],
    createdAt: now,
    updatedAt: now,
  };

  // Save config
  const savedPath = saveConfig(config, target);
  console.log(`\n✓ Created ${savedPath}`);

  // Check gitignore
  printGitignoreWarning();

  console.log('Ready! Run `gcd` to generate changelog.');
}
