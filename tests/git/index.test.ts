import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Import after mocking
import {
  isGitInstalled,
  isGitRepo,
  getCurrentBranch,
  branchExists,
  detectBaseBranch,
  getCommitsBetween,
  getRepoRoot,
  getRepoName,
} from '../../src/git/index.js';

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
    mockExecSync.mockReturnValue('yes');
    expect(branchExists('main')).toBe(true);
  });

  it('returns false when branch does not exist', () => {
    mockExecSync.mockReturnValue('no');
    expect(branchExists('nonexistent')).toBe(false);
  });
});

describe('detectBaseBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns main when main exists', () => {
    mockExecSync.mockReturnValue('yes');
    expect(detectBaseBranch()).toBe('main');
  });

  it('returns master when only master exists', () => {
    mockExecSync
      .mockReturnValueOnce('no')  // main check
      .mockReturnValueOnce('yes'); // master check
    expect(detectBaseBranch()).toBe('master');
  });

  it('returns null when neither main nor master exists', () => {
    mockExecSync.mockReturnValue('no');
    expect(detectBaseBranch()).toBe(null);
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
