import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Import after mocking
import {
  isGitInstalled,
  getGitVersion,
  isGitVersionSupported,
  isGitRepo,
  getCurrentBranch,
  branchExists,
  detectBaseBranch,
  getCommitsBetween,
  getRepoRoot,
  getRepoName,
  printNoGitError,
  printGitVersionError,
  getGitMeta,
} from '../../../src/git/index.js';
import { createMockCommits } from '../setup.js';

const mockExecSync = vi.mocked(execSync);

describe('isGitInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when git is available', () => {
    mockExecSync.mockReturnValue('git version 2.40.0');
    expect(isGitInstalled()).toBe(true);
  });

  it('returns false when git is not available', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('git not found');
    });
    expect(isGitInstalled()).toBe(false);
  });
});

describe('getGitVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses standard git version string', () => {
    mockExecSync.mockReturnValue('git version 2.39.0');
    const version = getGitVersion();
    expect(version).toEqual({ major: 2, minor: 39, patch: 0 });
  });

  it('parses Windows git version string', () => {
    mockExecSync.mockReturnValue('git version 2.20.1.windows.1');
    const version = getGitVersion();
    expect(version).toEqual({ major: 2, minor: 20, patch: 1 });
  });

  it('returns null when git is not available', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('git not found');
    });
    expect(getGitVersion()).toBe(null);
  });

  it('returns null for invalid version string', () => {
    mockExecSync.mockReturnValue('invalid output');
    expect(getGitVersion()).toBe(null);
  });
});

describe('isGitVersionSupported', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for git >= 2.13', () => {
    mockExecSync.mockReturnValue('git version 2.39.0');
    expect(isGitVersionSupported()).toBe(true);
  });

  it('returns true for exactly git 2.13', () => {
    mockExecSync.mockReturnValue('git version 2.13.0');
    expect(isGitVersionSupported()).toBe(true);
  });

  it('returns true for git 3.x', () => {
    mockExecSync.mockReturnValue('git version 3.0.0');
    expect(isGitVersionSupported()).toBe(true);
  });

  it('returns false for git < 2.13', () => {
    mockExecSync.mockReturnValue('git version 2.12.9');
    expect(isGitVersionSupported()).toBe(false);
  });

  it('returns false for git 1.x', () => {
    mockExecSync.mockReturnValue('git version 1.9.5');
    expect(isGitVersionSupported()).toBe(false);
  });

  it('returns false when git is not available', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('git not found');
    });
    expect(isGitVersionSupported()).toBe(false);
  });
});

describe('isGitRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true inside a git repo', () => {
    mockExecSync.mockReturnValue('true');
    expect(isGitRepo()).toBe(true);
  });

  it('returns false outside a git repo', () => {
    mockExecSync.mockReturnValue('false');
    expect(isGitRepo()).toBe(false);
  });

  it('returns false when command fails', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });
    expect(isGitRepo()).toBe(false);
  });
});

describe('getCurrentBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current branch name', () => {
    mockExecSync.mockReturnValue('feature/my-branch\n');
    expect(getCurrentBranch()).toBe('feature/my-branch');
  });

  it('handles branches with slashes', () => {
    mockExecSync.mockReturnValue('feature/foo/bar\n');
    expect(getCurrentBranch()).toBe('feature/foo/bar');
  });

  it('returns empty string when detached HEAD', () => {
    mockExecSync.mockReturnValue('');
    expect(getCurrentBranch()).toBe('');
  });
});

describe('branchExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when branch exists', () => {
    mockExecSync.mockReturnValue('main\nfeature/test\ndevelop');
    expect(branchExists('main')).toBe(true);
  });

  it('returns true when branch exists among many', () => {
    mockExecSync.mockReturnValue('main\nfeature/test\ndevelop');
    expect(branchExists('feature/test')).toBe(true);
  });

  it('returns false when branch does not exist', () => {
    mockExecSync.mockReturnValue('main\ndevelop');
    expect(branchExists('nonexistent')).toBe(false);
  });

  it('returns false when no branches exist', () => {
    mockExecSync.mockReturnValue('');
    expect(branchExists('main')).toBe(false);
  });

  it('handles whitespace in branch list', () => {
    mockExecSync.mockReturnValue('  main  \n  develop  ');
    expect(branchExists('main')).toBe(true);
  });
});

describe('detectBaseBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns main when main exists', () => {
    mockExecSync.mockReturnValue('main\nfeature/test');
    expect(detectBaseBranch()).toBe('main');
  });

  it('returns master when only master exists', () => {
    mockExecSync
      .mockReturnValueOnce('master\nfeature/test')  // main check (main not in list)
      .mockReturnValueOnce('master\nfeature/test'); // master check (master in list)
    expect(detectBaseBranch()).toBe('master');
  });

  it('returns null when neither main nor master exists', () => {
    mockExecSync.mockReturnValue('develop\nfeature/test');
    expect(detectBaseBranch()).toBe(null);
  });

  it('returns main when both main and master exist', () => {
    mockExecSync.mockReturnValue('main\nmaster\nfeature/test');
    expect(detectBaseBranch()).toBe('main');
  });
});

describe('getRepoRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the repo root path', () => {
    mockExecSync.mockReturnValue('/Users/test/my-repo\n');
    expect(getRepoRoot()).toBe('/Users/test/my-repo');
  });
});

describe('getRepoName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts repo name from root path', () => {
    mockExecSync.mockReturnValue('/Users/test/my-repo\n');
    expect(getRepoName()).toBe('my-repo');
  });

  it('handles nested paths', () => {
    mockExecSync.mockReturnValue('/path/to/deep/nested/repo\n');
    expect(getRepoName()).toBe('repo');
  });
});

describe('getCommitsBetween', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const DELIM = '---GCD_COMMIT_DELIM---';
  const FIELD_DELIM = '---GCD_FIELD_DELIM---';

  it('parses commits correctly', () => {
    const mockOutput = [
      `abc123full${FIELD_DELIM}abc123${FIELD_DELIM}Test User${FIELD_DELIM}test@test.com${FIELD_DELIM}2025-01-29T10:00:00Z${FIELD_DELIM}feat: Add feature${FIELD_DELIM}`,
      `def456full${FIELD_DELIM}def456${FIELD_DELIM}Another User${FIELD_DELIM}another@test.com${FIELD_DELIM}2025-01-28T09:00:00Z${FIELD_DELIM}fix: Bug fix${FIELD_DELIM}`,
    ].join(DELIM);

    mockExecSync.mockReturnValue(mockOutput);

    const commits = getCommitsBetween('feature', 'main');

    expect(commits).toHaveLength(2);
    expect(commits[0].hash).toBe('abc123full');
    expect(commits[0].hashShort).toBe('abc123');
    expect(commits[0].author).toBe('Test User');
    expect(commits[0].authorEmail).toBe('test@test.com');
    expect(commits[0].subject).toBe('feat: Add feature');
    expect(commits[1].hash).toBe('def456full');
  });

  it('handles commits with body', () => {
    const body = 'This is the body\nwith multiple lines';
    const mockOutput = `abc123${FIELD_DELIM}abc${FIELD_DELIM}User${FIELD_DELIM}user@test.com${FIELD_DELIM}2025-01-29T10:00:00Z${FIELD_DELIM}feat: Subject${FIELD_DELIM}${body}${DELIM}`;

    mockExecSync.mockReturnValue(mockOutput);

    const commits = getCommitsBetween('feature', 'main');

    expect(commits).toHaveLength(1);
    expect(commits[0].body).toBe(body);
    expect(commits[0].message).toBe(`feat: Subject\n\n${body}`);
  });

  it('returns empty array when no commits', () => {
    mockExecSync.mockReturnValue('');

    const commits = getCommitsBetween('feature', 'main');

    expect(commits).toHaveLength(0);
  });

  it('returns empty array on error', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('git error');
    });

    const commits = getCommitsBetween('feature', 'main');

    expect(commits).toHaveLength(0);
  });

  it('initializes issues as empty array', () => {
    const mockOutput = `abc123${FIELD_DELIM}abc${FIELD_DELIM}User${FIELD_DELIM}user@test.com${FIELD_DELIM}2025-01-29T10:00:00Z${FIELD_DELIM}feat: PROJ-123${FIELD_DELIM}${DELIM}`;

    mockExecSync.mockReturnValue(mockOutput);

    const commits = getCommitsBetween('feature', 'main');

    expect(commits[0].issues).toEqual([]);
  });
});

describe('printNoGitError', () => {
  it('outputs error message to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printNoGitError();

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
    expect(output).toContain('Quack');
    expect(output).toContain('git');

    consoleSpy.mockRestore();
  });
});

describe('printGitVersionError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('outputs version error message with detected version', () => {
    mockExecSync.mockReturnValue('git version 2.10.0');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printGitVersionError();

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
    expect(output).toContain('Quack');
    expect(output).toContain('2.10.0');
    expect(output).toContain('too old');
    expect(output).toContain('2.13');

    consoleSpy.mockRestore();
  });

  it('shows unknown version when git version cannot be parsed', () => {
    mockExecSync.mockReturnValue('invalid');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printGitVersionError();

    const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
    expect(output).toContain('unknown');

    consoleSpy.mockRestore();
  });
});

describe('getGitMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns git metadata object', () => {
    mockExecSync.mockReturnValue('/test/repo\n');

    const commits = createMockCommits();
    const meta = getGitMeta('feature/test', 'main', commits);

    expect(meta.targetBranch).toBe('feature/test');
    expect(meta.baseBranch).toBe('main');
    expect(meta.totalCommits).toBe(6);
    expect(meta.repoName).toBe('repo');
  });

  it('handles empty commits', () => {
    mockExecSync.mockReturnValue('/my/project\n');

    const meta = getGitMeta('develop', 'main', []);

    expect(meta.totalCommits).toBe(0);
    expect(meta.repoName).toBe('project');
  });
});
