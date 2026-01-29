import { describe, it, expect } from 'vitest';
import { issuesTextFormatter, issuesJsonFormatter, issuesMdFormatter } from '../../../src/formatters/issues.js';
import { createMockCommits, createMockMeta } from '../setup.js';

const mockCtx = {
  commits: createMockCommits(),
  issues: ['PROJ-123', 'PROJ-456'],
  meta: createMockMeta(),
};

describe('issuesTextFormatter', () => {
  it('outputs one issue per line', () => {
    const result = issuesTextFormatter(mockCtx);
    expect(result).toBe('PROJ-123\nPROJ-456');
  });

  it('handles empty issues', () => {
    const result = issuesTextFormatter({ ...mockCtx, issues: [] });
    expect(result).toBe('');
  });
});

describe('issuesJsonFormatter', () => {
  it('outputs JSON array', () => {
    const result = issuesJsonFormatter(mockCtx);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(['PROJ-123', 'PROJ-456']);
  });

  it('handles empty issues', () => {
    const result = issuesJsonFormatter({ ...mockCtx, issues: [] });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual([]);
  });
});

describe('issuesMdFormatter', () => {
  it('outputs markdown list', () => {
    const result = issuesMdFormatter(mockCtx);
    expect(result).toContain('## Issues');
    expect(result).toContain('- PROJ-123');
    expect(result).toContain('- PROJ-456');
  });

  it('handles empty issues', () => {
    const result = issuesMdFormatter({ ...mockCtx, issues: [] });
    expect(result).toContain('No issues found');
  });
});
