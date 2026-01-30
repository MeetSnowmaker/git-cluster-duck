import { execSync } from 'child_process';
import pc from 'picocolors';
import { Commit, GitMeta } from './types.js';

function exec(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

const MIN_GIT_VERSION = { major: 2, minor: 13 };

export function isGitInstalled(): boolean {
  try {
    execSync('git --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

export function getGitVersion(): { major: number; minor: number; patch: number } | null {
  try {
    const output = execSync('git --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    // "git version 2.20.1.windows.1" or "git version 2.39.0"
    const match = output.match(/git version (\d+)\.(\d+)\.(\d+)/);
    if (match) {
      return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function isGitVersionSupported(): boolean {
  const version = getGitVersion();
  if (!version) return false;
  if (version.major > MIN_GIT_VERSION.major) return true;
  if (version.major === MIN_GIT_VERSION.major && version.minor >= MIN_GIT_VERSION.minor) return true;
  return false;
}

export function printNoGitError(): void {
  console.error('');
  console.error(pc.yellow('🦆 Quack! Git is not installed or not in your PATH.'));
  console.error('');
  console.error(pc.dim('   The duck cannot cluster what the duck cannot find.'));
  console.error('');
  console.error(`   Please install git: ${pc.cyan('https://git-scm.com/downloads')}`);
  console.error('');
}

export function printGitVersionError(): void {
  const version = getGitVersion();
  const versionStr = version ? `${version.major}.${version.minor}.${version.patch}` : 'unknown';
  console.error('');
  console.error(pc.yellow(`🦆 Quack! Git version ${versionStr} is too old.`));
  console.error('');
  console.error(pc.dim(`   git-cluster-duck requires Git >= ${MIN_GIT_VERSION.major}.${MIN_GIT_VERSION.minor}`));
  console.error('');
  console.error(`   Please update git: ${pc.cyan('https://git-scm.com/downloads')}`);
  console.error('');
}

export function isGitRepo(): boolean {
  const result = exec('git rev-parse --is-inside-work-tree');
  return result === 'true';
}

export function getRepoRoot(): string {
  return exec('git rev-parse --show-toplevel');
}

export function getRepoName(): string {
  const root = getRepoRoot();
  return root.split('/').pop() || 'unknown';
}

export function getCurrentBranch(): string {
  return exec('git rev-parse --abbrev-ref HEAD');
}

export function branchExists(branch: string): boolean {
  const branches = exec('git branch --format=%(refname:short)');
  return branches.split('\n').some((b) => b.trim() === branch);
}

export function detectBaseBranch(): string | null {
  if (branchExists('main')) return 'main';
  if (branchExists('master')) return 'master';
  return null;
}

export function getCommitsBetween(target: string, base: string): Commit[] {
  // Use a delimiter that won't appear in commit messages
  const DELIM = '---GCD_COMMIT_DELIM---';
  const FIELD_DELIM = '---GCD_FIELD_DELIM---';

  // Format: hash, short hash, author name, author email, date, subject, body
  const format = [
    '%H',    // full hash
    '%h',    // short hash
    '%an',   // author name
    '%ae',   // author email
    '%aI',   // ISO date
    '%s',    // subject (first line)
    '%b',    // body (rest of message)
  ].join(FIELD_DELIM);

  const command = `git log ${base}..${target} --pretty=format:"${format}${DELIM}"`;
  const output = exec(command);

  if (!output) {
    return [];
  }

  const commits: Commit[] = output
    .split(DELIM)
    .filter(Boolean)
    .map((chunk) => {
      const [hash, hashShort, author, authorEmail, date, subject, ...bodyParts] = chunk
        .trim()
        .split(FIELD_DELIM);

      const body = bodyParts.join(FIELD_DELIM).trim();
      const message = body ? `${subject}\n\n${body}` : subject;

      return {
        hash,
        hashShort,
        author,
        authorEmail,
        date,
        subject,
        body,
        message,
        issues: [], // Will be populated by issue extractor
      };
    });

  return commits;
}

export function getGitMeta(target: string, base: string, commits: Commit[]): GitMeta {
  return {
    repoRoot: getRepoRoot(),
    repoName: getRepoName(),
    targetBranch: target,
    baseBranch: base,
    totalCommits: commits.length,
  };
}

export * from './types.js';
