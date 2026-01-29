import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';

// Mock dependencies
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('../../../src/git/index.js', () => ({
  getRepoRoot: vi.fn(() => '/test/repo'),
}));

// Import after mocking
import { checkGitignoreEntry, printGitignoreWarning } from '../../../src/config/gitignore.js';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe('checkGitignoreEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when .gitignore does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    expect(checkGitignoreEntry('temp/gcd')).toBe(false);
  });

  it('returns true when exact entry exists', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('node_modules\ntemp/gcd\n.env');

    expect(checkGitignoreEntry('temp/gcd')).toBe(true);
  });

  it('returns false when entry is not in gitignore', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('node_modules\n.env');

    expect(checkGitignoreEntry('temp/gcd')).toBe(false);
  });

  it('handles trailing slashes', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('temp/gcd/');

    expect(checkGitignoreEntry('temp/gcd')).toBe(true);
  });

  it('handles leading ./ in entry', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('temp/gcd');

    expect(checkGitignoreEntry('./temp/gcd')).toBe(true);
  });

  it('handles leading / in gitignore line', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('/temp/gcd');

    expect(checkGitignoreEntry('temp/gcd')).toBe(true);
  });

  it('returns false on read error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('read error');
    });

    expect(checkGitignoreEntry('temp/gcd')).toBe(false);
  });

  it('handles whitespace in gitignore lines', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('  temp/gcd  \nnode_modules');

    expect(checkGitignoreEntry('temp/gcd')).toBe(true);
  });

  it('handles empty gitignore', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('');

    expect(checkGitignoreEntry('temp/gcd')).toBe(false);
  });

  it('handles gitignore with only comments', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('# Comment\n# Another comment');

    expect(checkGitignoreEntry('temp/gcd')).toBe(false);
  });
});

describe('printGitignoreWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prints warning when temp/gcd is not in gitignore', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('node_modules');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printGitignoreWarning();

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
    expect(output).toContain('Warning');
    expect(output).toContain('temp/gcd');

    consoleSpy.mockRestore();
  });

  it('prints no warning when temp/gcd is in gitignore', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('node_modules\ntemp/gcd');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printGitignoreWarning();

    // Should not have printed the warning
    const warningCalls = consoleSpy.mock.calls.filter(
      call => call[0]?.includes?.('Warning')
    );
    expect(warningCalls).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it('warns for custom output directory', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('temp/gcd');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printGitignoreWarning('./output/{date}/{time}');

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
    expect(output).toContain('output');

    consoleSpy.mockRestore();
  });

  it('does not warn when custom dir matches default', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('temp/gcd');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printGitignoreWarning('./temp/gcd/{date}/{time}');

    const warningCalls = consoleSpy.mock.calls.filter(
      call => call[0]?.includes?.('Warning')
    );
    expect(warningCalls).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});
