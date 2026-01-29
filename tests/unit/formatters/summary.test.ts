import { describe, it, expect } from 'vitest';
import { summaryTextFormatter, summaryJsonFormatter, summaryMdFormatter } from '../../../src/formatters/summary.js';
import { createMockCommits, createMockMeta } from '../setup.js';

const mockCtx = {
  commits: createMockCommits(),
  issues: ['PROJ-123', 'PROJ-456'],
  meta: createMockMeta(),
};

describe('summaryTextFormatter', () => {
  it('groups commits by issue', () => {
    const result = summaryTextFormatter(mockCtx);

    expect(result).toContain('PROJ-123');
    expect(result).toContain('aaa111 - feat: Add login feature PROJ-123');
    expect(result).toContain('PROJ-456');
    expect(result).toContain('bbb222 - fix: Fix authentication bug PROJ-456');
    expect(result).toContain('No Issue');
    expect(result).toContain('ccc333 - chore: Update dependencies');
  });

  it('sorts issues alphabetically with No Issue last', () => {
    const result = summaryTextFormatter(mockCtx);
    const lines = result.split('\n').filter(Boolean);

    const proj123Index = lines.findIndex(l => l === 'PROJ-123');
    const proj456Index = lines.findIndex(l => l === 'PROJ-456');
    const noIssueIndex = lines.findIndex(l => l === 'No Issue');

    expect(proj123Index).toBeLessThan(proj456Index);
    expect(proj456Index).toBeLessThan(noIssueIndex);
  });
});

describe('summaryJsonFormatter', () => {
  it('outputs grouped JSON', () => {
    const result = summaryJsonFormatter(mockCtx);
    const parsed = JSON.parse(result);

    expect(parsed['PROJ-123']).toHaveLength(1);
    expect(parsed['PROJ-123'][0].hash).toBe('aaa111');
    expect(parsed['PROJ-456']).toHaveLength(1);
    expect(parsed['_noIssue']).toHaveLength(1);
  });
});

describe('summaryMdFormatter', () => {
  it('outputs nested markdown', () => {
    const result = summaryMdFormatter(mockCtx);

    expect(result).toContain('## Issue Summary');
    expect(result).toContain('### PROJ-123');
    expect(result).toContain('- `aaa111` feat: Add login feature PROJ-123');
    expect(result).toContain('### No Issue');
  });
});
