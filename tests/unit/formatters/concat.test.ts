import { describe, it, expect } from 'vitest';
import { concatTextFormatter, concatJsonFormatter, concatMdFormatter } from '../../../src/formatters/concat.js';
import { createMockCommits, createMockMeta } from '../setup.js';

const mockCtx = {
  commits: createMockCommits(),
  issues: ['PROJ-123', 'PROJ-456'],
  meta: createMockMeta(),
};

describe('concatTextFormatter', () => {
  it('outputs first line with issues', () => {
    const result = concatTextFormatter(mockCtx);
    const lines = result.split('\n');

    expect(lines[0]).toBe('feat: Add login feature PROJ-123 [PROJ-123]');
    expect(lines[1]).toBe('fix: Fix authentication bug PROJ-456 [PROJ-456]');
    expect(lines[2]).toBe('chore: Update dependencies');
  });

  it('handles commits without issues', () => {
    const ctx = {
      ...mockCtx,
      commits: [{ ...mockCtx.commits[2], issues: [] }],
    };
    const result = concatTextFormatter(ctx);
    expect(result).toBe('chore: Update dependencies');
  });
});

describe('concatJsonFormatter', () => {
  it('outputs simplified JSON', () => {
    const result = concatJsonFormatter(mockCtx);
    const parsed = JSON.parse(result);

    expect(parsed.entries).toHaveLength(3);
    expect(parsed.entries[0]).toEqual({
      message: 'feat: Add login feature PROJ-123',
      issues: ['PROJ-123'],
    });
    expect(parsed.allIssues).toEqual(['PROJ-123', 'PROJ-456']);
  });
});

describe('concatMdFormatter', () => {
  it('outputs markdown list', () => {
    const result = concatMdFormatter(mockCtx);

    expect(result).toContain('## Changelog');
    expect(result).toContain('- feat: Add login feature PROJ-123 `PROJ-123`');
    expect(result).toContain('- chore: Update dependencies');
  });
});
