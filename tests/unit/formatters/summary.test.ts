import { describe, it, expect } from 'vitest';
import { summaryTextFormatter, summaryJsonFormatter, summaryMdFormatter } from '../../../src/formatters/summary.js';
import { createMockCommit, createMockCommits, createMockMeta } from '../setup.js';

const mockCtx = {
  commits: createMockCommits(),
  issues: ['ALPHA-001', 'PROJ-123', 'PROJ-456', 'ZEBRA-100'],
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

    const alphaIndex = lines.findIndex(l => l === 'ALPHA-001');
    const proj123Index = lines.findIndex(l => l === 'PROJ-123');
    const proj456Index = lines.findIndex(l => l === 'PROJ-456');
    const zebraIndex = lines.findIndex(l => l === 'ZEBRA-100');
    const noIssueIndex = lines.findIndex(l => l === 'No Issue');

    // Alphabetical order: ALPHA < PROJ-123 < PROJ-456 < ZEBRA
    expect(alphaIndex).toBeLessThan(proj123Index);
    expect(proj123Index).toBeLessThan(proj456Index);
    expect(proj456Index).toBeLessThan(zebraIndex);
    // No Issue always last
    expect(zebraIndex).toBeLessThan(noIssueIndex);
    expect(noIssueIndex).toBeGreaterThan(-1);
  });
});

describe('summaryJsonFormatter', () => {
  it('outputs grouped JSON', () => {
    const result = summaryJsonFormatter(mockCtx);
    const parsed = JSON.parse(result);

    // PROJ-123 appears in aaa111 and fff666
    expect(parsed['PROJ-123']).toHaveLength(2);
    expect(parsed['PROJ-123'][0].hash).toBe('aaa111');
    // PROJ-456 appears in bbb222 and fff666
    expect(parsed['PROJ-456']).toHaveLength(2);
    expect(parsed['ALPHA-001']).toHaveLength(1);
    expect(parsed['ZEBRA-100']).toHaveLength(1);
    expect(parsed['_noIssue']).toHaveLength(1);
  });

  it('groups multiple no-issue commits together', () => {
    const multiNoIssueCtx = {
      commits: [
        createMockCommit({ hash: 'no1', hashShort: 'no1', subject: 'chore: First', issues: [] }),
        createMockCommit({ hash: 'no2', hashShort: 'no2', subject: 'chore: Second', issues: [] }),
        createMockCommit({ hash: 'no3', hashShort: 'no3', subject: 'chore: Third', issues: [] }),
      ],
      issues: [],
      meta: createMockMeta({ totalCommits: 3 }),
    };

    const result = summaryJsonFormatter(multiNoIssueCtx);
    const parsed = JSON.parse(result);

    expect(parsed['_noIssue']).toHaveLength(3);
    expect(parsed['_noIssue'][0].hash).toBe('no1');
    expect(parsed['_noIssue'][1].hash).toBe('no2');
    expect(parsed['_noIssue'][2].hash).toBe('no3');
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
