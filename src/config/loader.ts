import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Config, DEFAULT_CONFIG } from './types.js';
import {
  getGlobalConfigPath,
  getLocalConfigPath,
  ensureGlobalConfigDir,
  globalConfigExists,
  localConfigExists,
} from './paths.js';
import { getRepoName, detectBaseBranch } from '../git/index.js';

export function loadGlobalConfig(): Partial<Config> | null {
  const path = getGlobalConfigPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function loadLocalConfig(): Partial<Config> | null {
  const path = getLocalConfigPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function loadConfig(): Config {
  const globalConfig = loadGlobalConfig();
  const localConfig = loadLocalConfig();

  const now = new Date().toISOString();

  // Build config with defaults, then global, then local (local overrides global)
  const config: Config = {
    repoName: getRepoName(),
    baseBranch: detectBaseBranch() || 'main',
    ...DEFAULT_CONFIG,
    createdAt: now,
    updatedAt: now,
    ...globalConfig,
    ...localConfig,
  };

  return config;
}

export function saveConfig(config: Config, target: 'global' | 'local'): string {
  const updatedConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  let path: string;

  if (target === 'global') {
    ensureGlobalConfigDir();
    path = getGlobalConfigPath(config.repoName);
  } else {
    path = getLocalConfigPath();
  }

  writeFileSync(path, JSON.stringify(updatedConfig, null, 2) + '\n');
  return path;
}

export function createDefaultConfig(): Config {
  const now = new Date().toISOString();

  return {
    repoName: getRepoName(),
    baseBranch: detectBaseBranch() || 'main',
    ...DEFAULT_CONFIG,
    createdAt: now,
    updatedAt: now,
  };
}

export { globalConfigExists, localConfigExists };
