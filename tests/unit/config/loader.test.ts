import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

// Mock dependencies
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}));

vi.mock('../../../src/git/index.js', () => ({
  getRepoRoot: vi.fn(() => '/test/repo'),
  getRepoName: vi.fn(() => 'test-repo'),
  detectBaseBranch: vi.fn(() => 'main'),
}));

// Import after mocking
import {
  loadGlobalConfig,
  loadLocalConfig,
  loadConfig,
  saveConfig,
  createDefaultConfig,
} from '../../../src/config/loader.js';
import { DEFAULT_CONFIG, Config } from '../../../src/config/types.js';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);

describe('loadGlobalConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when global config does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadGlobalConfig()).toBe(null);
  });

  it('loads and parses global config when it exists', () => {
    const mockConfig = { baseBranch: 'develop', outputDir: './custom' };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    const result = loadGlobalConfig();

    expect(result).toEqual(mockConfig);
  });

  it('returns null on parse error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('invalid json {{{');

    expect(loadGlobalConfig()).toBe(null);
  });
});

describe('loadLocalConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when local config does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadLocalConfig()).toBe(null);
  });

  it('loads and parses local config when it exists', () => {
    const mockConfig = { baseBranch: 'staging' };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    const result = loadLocalConfig();

    expect(result).toEqual(mockConfig);
  });

  it('returns null on read error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('read error');
    });

    expect(loadLocalConfig()).toBe(null);
  });
});

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults when no config files exist', () => {
    mockExistsSync.mockReturnValue(false);

    const config = loadConfig();

    expect(config.repoName).toBe('test-repo');
    expect(config.baseBranch).toBe('main');
    expect(config.defaultOutputs).toEqual(DEFAULT_CONFIG.defaultOutputs);
    expect(config.outputDir).toBe(DEFAULT_CONFIG.outputDir);
  });

  it('merges global config over defaults', () => {
    const globalConfig = { baseBranch: 'develop' };

    mockExistsSync.mockImplementation((path: string) => {
      return path.includes('.config/git-cluster-duck');
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(globalConfig));

    const config = loadConfig();

    expect(config.baseBranch).toBe('develop');
  });

  it('local config overrides global config', () => {
    const globalConfig = { baseBranch: 'develop', outputDir: './global-out' };
    const localConfig = { baseBranch: 'staging' };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(JSON.stringify(globalConfig)) // global
      .mockReturnValueOnce(JSON.stringify(localConfig)); // local

    const config = loadConfig();

    expect(config.baseBranch).toBe('staging');
    expect(config.outputDir).toBe('./global-out'); // from global
  });
});

describe('saveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves to global path for global target', () => {
    const config: Config = {
      repoName: 'test-repo',
      baseBranch: 'main',
      ...DEFAULT_CONFIG,
      createdAt: '2025-01-29T00:00:00Z',
      updatedAt: '2025-01-29T00:00:00Z',
    };

    mockExistsSync.mockReturnValue(true);

    const path = saveConfig(config, 'global');

    expect(path).toContain('.config/git-cluster-duck');
    expect(path).toContain('test-repo.json');
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('saves to local path for local target', () => {
    const config: Config = {
      repoName: 'test-repo',
      baseBranch: 'main',
      ...DEFAULT_CONFIG,
      createdAt: '2025-01-29T00:00:00Z',
      updatedAt: '2025-01-29T00:00:00Z',
    };

    const path = saveConfig(config, 'local');

    expect(path).toBe('/test/repo/.git-cluster-duck.json');
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('updates the updatedAt timestamp', () => {
    const config: Config = {
      repoName: 'test-repo',
      baseBranch: 'main',
      ...DEFAULT_CONFIG,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    mockExistsSync.mockReturnValue(true);

    saveConfig(config, 'local');

    const savedContent = mockWriteFileSync.mock.calls[0][1] as string;
    const savedConfig = JSON.parse(savedContent);

    expect(savedConfig.updatedAt).not.toBe('2025-01-01T00:00:00Z');
  });

  it('creates global config directory if needed', () => {
    const config: Config = {
      repoName: 'test-repo',
      baseBranch: 'main',
      ...DEFAULT_CONFIG,
      createdAt: '2025-01-29T00:00:00Z',
      updatedAt: '2025-01-29T00:00:00Z',
    };

    mockExistsSync.mockReturnValue(false);

    saveConfig(config, 'global');

    expect(mockMkdirSync).toHaveBeenCalled();
  });
});

describe('createDefaultConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates config with repo-specific values', () => {
    const config = createDefaultConfig();

    expect(config.repoName).toBe('test-repo');
    expect(config.baseBranch).toBe('main');
  });

  it('includes all default values', () => {
    const config = createDefaultConfig();

    expect(config.defaultOutputs).toEqual(DEFAULT_CONFIG.defaultOutputs);
    expect(config.ticketPatterns).toEqual(DEFAULT_CONFIG.ticketPatterns);
    expect(config.outputDir).toBe(DEFAULT_CONFIG.outputDir);
  });

  it('sets timestamps', () => {
    const config = createDefaultConfig();

    expect(config.createdAt).toBeDefined();
    expect(config.updatedAt).toBeDefined();
  });
});
