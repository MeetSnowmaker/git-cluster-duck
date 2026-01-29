import { describe, it, expect } from 'vitest';
import { verboseTextFormatter, verboseJsonFormatter, verboseMdFormatter } from '../../../src/formatters/verbose.js';
import { createMockCommit, createMockMeta } from '../setup.js';

const mockCtx = {
  commits: [
    createMockCommit({
      hash: 'aaa111full',
      hashShort: 'aaa111',
      subject: 'feat: Add feature',
      body: 'This is the body\nwith multiple lines',
      issues: ['PROJ-123'],
    }),
    createMockCommit({
      hash: 'bbb222full',
      hashShort: 'bbb222',
      subject: 'chore: No issue',
      body: '',
      issues: [],
    }),
  ],
  issues: ['PROJ-123'],
  meta: createMockMeta(),
};

describe('verboseTextFormatter', () => {
  it('outputs full commit details grouped by issue', () => {
    const result = verboseTextFormatter(mockCtx);

    expect(result).toContain('PROJ-123');
    expect(result).toContain('aaa111full');
    expect(result).toContain('Author: Test User <test@example.com>');
    expect(result).toContain('feat: Add feature');
    expect(result).toContain('This is the body');
    expect(result).toContain('No Issue');
  });
});

describe('verboseJsonFormatter', () => {
  it('outputs full commit objects grouped', () => {
    const result = verboseJsonFormatter(mockCtx);
    const parsed = JSON.parse(result);

    expect(parsed['PROJ-123']).toHaveLength(1);
    expect(parsed['PROJ-123'][0].hash).toBe('aaa111full');
    expect(parsed['PROJ-123'][0].message).toContain('This is the body');
    expect(parsed['_noIssue']).toHaveLength(1);
  });

  it('groups multiple no-issue commits together', () => {
    const multiNoIssueCtx = {
      commits: [
        createMockCommit({ hash: 'no1', hashShort: 'no1', subject: 'chore: First', issues: [] }),
        createMockCommit({ hash: 'no2', hashShort: 'no2', subject: 'chore: Second', issues: [] }),
      ],
      issues: [],
      meta: createMockMeta({ totalCommits: 2 }),
    };

    const result = verboseJsonFormatter(multiNoIssueCtx);
    const parsed = JSON.parse(result);

    expect(parsed['_noIssue']).toHaveLength(2);
  });
});

describe('verboseMdFormatter', () => {
  it('outputs full markdown with body', () => {
    const result = verboseMdFormatter(mockCtx);

    expect(result).toContain('## Issue Summary (Verbose)');
    expect(result).toContain('### PROJ-123');
    expect(result).toContain('#### `aaa111`');
    expect(result).toContain('- **Author:**');
    expect(result).toContain('feat: Add feature');
    expect(result).toContain('This is the body');
  });
});
