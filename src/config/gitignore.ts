import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { getRepoRoot } from '../git/index.js';

export function checkGitignoreEntry(entry: string): boolean {
  const gitignorePath = join(getRepoRoot(), '.gitignore');

  if (!existsSync(gitignorePath)) {
    return false;
  }

  try {
    const content = readFileSync(gitignorePath, 'utf-8');
    const lines = content.split('\n').map((line) => line.trim());

    // Normalize entry for comparison
    const normalized = entry.replace(/^\.\//, '').replace(/\/$/, '');

    return lines.some((line) => {
      const normalizedLine = line.replace(/^\//, '').replace(/\/$/, '');
      return normalizedLine === normalized ||
             normalizedLine === `${normalized}/` ||
             line === entry;
    });
  } catch {
    return false;
  }
}

export function printGitignoreWarning(outputDir?: string): void {
  const warnings: string[] = [];

  // Check default temp/gcd
  if (!checkGitignoreEntry('temp/gcd')) {
    warnings.push('temp/gcd/');
  }

  // Check custom output dir if different from default
  if (outputDir) {
    // Strip template variables and normalize
    const normalized = outputDir
      .replace(/\{date\}/g, '')
      .replace(/\{time\}/g, '')
      .replace(/\/+/g, '/')
      .replace(/\/+$/, '')
      .replace(/^\.\//, '');

    if (normalized && normalized !== 'temp/gcd') {
      if (!checkGitignoreEntry(normalized)) {
        warnings.push(normalized);
      }
    }
  }

  if (warnings.length > 0) {
    console.log('');
    console.log(pc.yellow('⚠ Warning: Output directories not in .gitignore:'));
    for (const dir of warnings) {
      console.log(pc.dim(`  - ${dir}`));
    }
    console.log(pc.dim('  Consider adding them to avoid committing generated files:'));
    for (const dir of warnings) {
      console.log(pc.dim(`  echo "${dir}" >> .gitignore`));
    }
  }
}
