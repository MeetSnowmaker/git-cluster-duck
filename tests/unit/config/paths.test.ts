import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}));

vi.mock('../../../src/git/index.js', () => ({
  getRepoRoot: vi.fn(() => '/test/repo'),
  getRepoName: vi.fn(() => 'test-repo'),
}));

import {
  getGlobalConfigDir,
  getGlobalConfigPath,
  getLocalConfigPath,
  ensureGlobalConfigDir,
  globalConfigExists,
  localConfigExists,
} from '../../../src/config/paths.js';

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);

describe('getGlobalConfigDir', () => {
  it('returns path in home .config directory', () => {
    const result = getGlobalConfigDir();
    expect(result).toBe('/home/testuser/.config/git-cluster-duck');
  });
});

describe('getGlobalConfigPath', () => {
  it('returns path with provided repo name', () => {
    const result = getGlobalConfigPath('my-repo');
    expect(result).toBe('/home/testuser/.config/git-cluster-duck/my-repo.json');
  });

  it('uses detected repo name when not provided', () => {
    const result = getGlobalConfigPath();
    expect(result).toBe('/home/testuser/.config/git-cluster-duck/test-repo.json');
  });
});

describe('getLocalConfigPath', () => {
  it('returns path in repo root', () => {
    const result = getLocalConfigPath();
    expect(result).toBe('/test/repo/.git-cluster-duck.json');
  });
});

describe('ensureGlobalConfigDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates directory when it does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    ensureGlobalConfigDir();

    expect(mockMkdirSync).toHaveBeenCalledWith(
      '/home/testuser/.config/git-cluster-duck',
      { recursive: true }
    );
  });

  it('does not create directory when it exists', () => {
    mockExistsSync.mockReturnValue(true);

    ensureGlobalConfigDir();

    expect(mockMkdirSync).not.toHaveBeenCalled();
  });
});

describe('globalConfigExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when config exists', () => {
    mockExistsSync.mockReturnValue(true);

    expect(globalConfigExists('my-repo')).toBe(true);
  });

  it('returns false when config does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    expect(globalConfigExists()).toBe(false);
  });
});

describe('localConfigExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when local config exists', () => {
    mockExistsSync.mockReturnValue(true);

    expect(localConfigExists()).toBe(true);
  });

  it('returns false when local config does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    expect(localConfigExists()).toBe(false);
  });
});
