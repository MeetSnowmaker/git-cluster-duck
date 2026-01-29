import { Commit, GitMeta } from '../../src/git/types.js';

/**
 * Create a mock commit for testing
 * Note: `message` is derived from `subject` and `body` to match real git behavior
 */
export function createMockCommit(overrides: Partial<Commit> = {}): Commit {
  const subject = overrides.subject ?? 'Test commit message';
  const body = overrides.body ?? '';
  const message = overrides.message ?? (body ? `${subject}\n\n${body}` : subject);

  return {
    hash: overrides.hash ?? 'abc123def456',
    hashShort: overrides.hashShort ?? 'abc123d',
    author: overrides.author ?? 'Test User',
    authorEmail: overrides.authorEmail ?? 'test@example.com',
    date: overrides.date ?? '2025-01-29T12:00:00Z',
    subject,
    body,
    message,
    issues: overrides.issues ?? [],
  };
}

/**
 * Create mock commits covering all test scenarios:
 * - With/without body (message derivation)
 * - With/without issues (no-issue bucket)
 * - Various issue names (alphabetical sort: ALPHA < MIDDLE < PROJ < ZEBRA)
 * - Multiple issues in one commit
 */
export function createMockCommits(): Commit[] {
  return [
    // With body, single issue
    createMockCommit({
      hash: 'aaa111',
      hashShort: 'aaa111',
      subject: 'feat: Add login feature PROJ-123',
      body: 'Implements OAuth2 login flow.\n\nCloses PROJ-123',
      issues: ['PROJ-123'],
    }),
    // Without body, single issue
    createMockCommit({
      hash: 'bbb222',
      hashShort: 'bbb222',
      subject: 'fix: Fix authentication bug PROJ-456',
      body: '',
      issues: ['PROJ-456'],
    }),
    // With body, no issues (for _noIssue bucket)
    createMockCommit({
      hash: 'ccc333',
      hashShort: 'ccc333',
      subject: 'chore: Update dependencies',
      body: 'Bumped all deps to latest.',
      issues: [],
    }),
    // For sort testing: ALPHA comes first alphabetically
    createMockCommit({
      hash: 'ddd444',
      hashShort: 'ddd444',
      subject: 'feat: Alpha feature ALPHA-001',
      body: '',
      issues: ['ALPHA-001'],
    }),
    // For sort testing: ZEBRA comes last alphabetically (before _noIssue)
    createMockCommit({
      hash: 'eee555',
      hashShort: 'eee555',
      subject: 'feat: Zebra feature ZEBRA-100',
      body: '',
      issues: ['ZEBRA-100'],
    }),
    // Multiple issues in one commit
    createMockCommit({
      hash: 'fff666',
      hashShort: 'fff666',
      subject: 'fix: Fix multiple bugs PROJ-123 PROJ-456',
      body: 'Addresses both issues.',
      issues: ['PROJ-123', 'PROJ-456'],
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
    totalCommits: 6, // matches createMockCommits() length
    ...overrides,
  };
}
