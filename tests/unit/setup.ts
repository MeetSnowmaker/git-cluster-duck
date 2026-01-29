import { Commit, GitMeta } from '../../src/git/types.js';

/**
 * Create a mock commit for testing
 */
export function createMockCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    hash: 'abc123def456',
    hashShort: 'abc123d',
    author: 'Test User',
    authorEmail: 'test@example.com',
    date: '2025-01-29T12:00:00Z',
    subject: 'Test commit message',
    body: '',
    message: 'Test commit message',
    issues: [],
    ...overrides,
  };
}

/**
 * Create mock commits with issues
 */
export function createMockCommits(): Commit[] {
  return [
    createMockCommit({
      hash: 'aaa111',
      hashShort: 'aaa111',
      subject: 'feat: Add login feature PROJ-123',
      message: 'feat: Add login feature PROJ-123',
      issues: ['PROJ-123'],
    }),
    createMockCommit({
      hash: 'bbb222',
      hashShort: 'bbb222',
      subject: 'fix: Fix authentication bug PROJ-456',
      message: 'fix: Fix authentication bug PROJ-456',
      issues: ['PROJ-456'],
    }),
    createMockCommit({
      hash: 'ccc333',
      hashShort: 'ccc333',
      subject: 'chore: Update dependencies',
      message: 'chore: Update dependencies',
      issues: [],
    }),
  ];
}

/**
 * Create mock git metadata
 */
export function createMockMeta(overrides: Partial<GitMeta> = {}): GitMeta {
  return {
    repoRoot: '/test/repo',
    repoName: 'test-repo',
    targetBranch: 'feature/test',
    baseBranch: 'main',
    totalCommits: 3,
    ...overrides,
  };
}
