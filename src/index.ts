#!/usr/bin/env node

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

program
  .name('gcd')
  .description('Compare git branches and generate changelogs with automatic issue detection')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize git-cluster-duck configuration for this repository')
  .option('--global', 'Create global config only')
  .option('--local', 'Create local config in repo root')
  .option('--force', 'Overwrite existing config')
  .action(initCommand);

program
  .argument('[target]', 'Target branch to compare (default: current branch)')
  .argument('[base]', 'Base branch to compare against (default: main or master)')
  .option('-f, --format <formats>', 'Output format(s), comma-separated')
  .option('-o, --output <dir>', 'Output directory')
  .option('--stdout', 'Print to stdout instead of files')
  .option('--no-issues', 'Skip issue extraction')
  .option('-p, --pattern <regex>', 'Override ticket pattern')
  .action(runCommand);

program.parse();
