import { describe, it, expect } from 'vitest';
import { textFormatter, jsonFormatter, mdFormatter } from '../../src/formatters/raw.js';
import { createMockCommits, createMockMeta } from '../setup.js';

const mockCtx = {
  commits: createMockCommits(),
  issues: ['PROJ-123', 'PROJ-456'],
  meta: createMockMeta(),
};

describe('textFormatter (raw-text)', () => {
  it('outputs git log style', () => {
    const result = textFormatter(mockCtx);

    expect(result).toContain('Changelog: feature/test → main');
    expect(result).toContain('Commits: 3');
    expect(result).toContain('commit aaa111');
    expect(result).toContain('Author: Test User <test@example.com>');
    expect(result).toContain('feat: Add login feature PROJ-123');
  });
});

describe('jsonFormatter (raw-json)', () => {
  it('outputs valid JSON', () => {
    const result = jsonFormatter(mockCtx);
    const parsed = JSON.parse(result);

    expect(parsed.meta.targetBranch).toBe('feature/test');
    expect(parsed.meta.baseBranch).toBe('main');
    expect(parsed.meta.totalCommits).toBe(3);
    expect(parsed.issues).toEqual(['PROJ-123', 'PROJ-456']);
    expect(parsed.commits).toHaveLength(3);
  });

  it('includes full commit data', () => {
    const result = jsonFormatter(mockCtx);
    const parsed = JSON.parse(result);
    const commit = parsed.commits[0];

    expect(commit.hash).toBe('aaa111');
    expect(commit.hashShort).toBe('aaa111');
    expect(commit.author).toBe('Test User');
    expect(commit.authorEmail).toBe('test@example.com');
    expect(commit.subject).toBe('feat: Add login feature PROJ-123');
    expect(commit.issues).toEqual(['PROJ-123']);
  });
});

describe('mdFormatter (raw-md)', () => {
  it('outputs markdown', () => {
    const result = mdFormatter(mockCtx);

    expect(result).toContain('# Changelog: feature/test → main');
    expect(result).toContain('**Commits:** 3');
    expect(result).toContain('### `aaa111` feat: Add login feature PROJ-123');
    expect(result).toContain('- **Author:**');
    expect(result).toContain('- **Issues:** `PROJ-123`');
  });

  it('includes issues section', () => {
    const result = mdFormatter(mockCtx);

    expect(result).toContain('## Issues Referenced');
    expect(result).toContain('- PROJ-123');
    expect(result).toContain('- PROJ-456');
  });
});
