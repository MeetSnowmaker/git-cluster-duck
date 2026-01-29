import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getRepoRoot, getRepoName } from '../git/index.js';

export function getGlobalConfigDir(): string {
  const dir = join(homedir(), '.config', 'git-cluster-duck');
  return dir;
}

export function getGlobalConfigPath(repoName?: string): string {
  const name = repoName || getRepoName();
  return join(getGlobalConfigDir(), `${name}.json`);
}

export function getLocalConfigPath(): string {
  const root = getRepoRoot();
  return join(root, '.git-cluster-duck.json');
}

export function ensureGlobalConfigDir(): void {
  const dir = getGlobalConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function globalConfigExists(repoName?: string): boolean {
  return existsSync(getGlobalConfigPath(repoName));
}

export function localConfigExists(): boolean {
  return existsSync(getLocalConfigPath());
}
