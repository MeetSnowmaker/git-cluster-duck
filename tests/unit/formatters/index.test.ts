import { describe, it, expect } from 'vitest';
import {
  FORMATTERS,
  ALL_FORMAT_NAMES,
  formatOutput,
  getExtension,
} from '../../../src/formatters/index.js';
import { createMockCommits, createMockMeta } from '../setup.js';

const mockCtx = {
  commits: createMockCommits(),
  issues: ['ALPHA-001', 'PROJ-123', 'PROJ-456', 'ZEBRA-100'],
  meta: createMockMeta(),
};

describe('FORMATTERS', () => {
  it('contains all 15 formatters', () => {
    expect(Object.keys(FORMATTERS)).toHaveLength(15);
  });

  it('has correct extensions for each format', () => {
    expect(FORMATTERS['raw-text'].extension).toBe('txt');
    expect(FORMATTERS['raw-json'].extension).toBe('json');
    expect(FORMATTERS['raw-md'].extension).toBe('md');
    expect(FORMATTERS['concat-text'].extension).toBe('txt');
    expect(FORMATTERS['summary-json'].extension).toBe('json');
    expect(FORMATTERS['verbose-md'].extension).toBe('md');
  });
});

describe('ALL_FORMAT_NAMES', () => {
  it('contains all format names', () => {
    expect(ALL_FORMAT_NAMES).toHaveLength(15);
    expect(ALL_FORMAT_NAMES).toContain('raw-text');
    expect(ALL_FORMAT_NAMES).toContain('raw-json');
    expect(ALL_FORMAT_NAMES).toContain('raw-md');
    expect(ALL_FORMAT_NAMES).toContain('concat-text');
    expect(ALL_FORMAT_NAMES).toContain('issues-md');
    expect(ALL_FORMAT_NAMES).toContain('summary-json');
    expect(ALL_FORMAT_NAMES).toContain('verbose-text');
  });
});

describe('formatOutput', () => {
  it('returns formatted output for valid format', () => {
    const result = formatOutput('raw-json', mockCtx);
    const parsed = JSON.parse(result);

    expect(parsed.commits).toHaveLength(6);
    expect(parsed.issues).toEqual(['ALPHA-001', 'PROJ-123', 'PROJ-456', 'ZEBRA-100']);
  });

  it('throws for unknown format', () => {
    expect(() => formatOutput('invalid-format', mockCtx)).toThrow('Unknown format: invalid-format');
  });

  it('works with all format types', () => {
    for (const name of ALL_FORMAT_NAMES) {
      const result = formatOutput(name, mockCtx);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

describe('getExtension', () => {
  it('returns correct extension for known formats', () => {
    expect(getExtension('raw-text')).toBe('txt');
    expect(getExtension('raw-json')).toBe('json');
    expect(getExtension('raw-md')).toBe('md');
  });

  it('returns txt as default for unknown format', () => {
    expect(getExtension('unknown')).toBe('txt');
  });
});
