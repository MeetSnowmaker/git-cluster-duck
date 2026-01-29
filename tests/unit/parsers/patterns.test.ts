import { describe, it, expect } from 'vitest';
import { PREDEFINED_PATTERNS, DEFAULT_PATTERN, getPatternByName } from '../../../src/parsers/patterns.js';

describe('PREDEFINED_PATTERNS', () => {
  it('has jira pattern', () => {
    expect(PREDEFINED_PATTERNS.jira).toBe('[A-Za-z]+-\\d+');
  });

  it('has github pattern', () => {
    expect(PREDEFINED_PATTERNS.github).toBe('#\\d+');
  });

  it('has gitlab pattern', () => {
    expect(PREDEFINED_PATTERNS.gitlab).toBe('!\\d+');
  });

  it('has azure pattern', () => {
    expect(PREDEFINED_PATTERNS.azure).toBe('AB#\\d+');
  });

  it('has linear pattern', () => {
    expect(PREDEFINED_PATTERNS.linear).toBe('[A-Z]+-\\d+');
  });

  it('has pivotal pattern', () => {
    expect(PREDEFINED_PATTERNS.pivotal).toBe('#\\d{8,}');
  });

  it('has shorthand pattern', () => {
    expect(PREDEFINED_PATTERNS.shorthand).toBe('[A-Za-z]+-\\d+|#\\d+');
  });

  describe('pattern matching', () => {
    it('jira matches PROJ-123', () => {
      const regex = new RegExp(PREDEFINED_PATTERNS.jira, 'g');
      expect('PROJ-123'.match(regex)).toEqual(['PROJ-123']);
    });

    it('jira matches lowercase abc-456', () => {
      const regex = new RegExp(PREDEFINED_PATTERNS.jira, 'g');
      expect('abc-456'.match(regex)).toEqual(['abc-456']);
    });

    it('github matches #123', () => {
      const regex = new RegExp(PREDEFINED_PATTERNS.github, 'g');
      expect('#123'.match(regex)).toEqual(['#123']);
    });

    it('gitlab matches !456', () => {
      const regex = new RegExp(PREDEFINED_PATTERNS.gitlab, 'g');
      expect('!456'.match(regex)).toEqual(['!456']);
    });

    it('azure matches AB#789', () => {
      const regex = new RegExp(PREDEFINED_PATTERNS.azure, 'g');
      expect('AB#789'.match(regex)).toEqual(['AB#789']);
    });

    it('pivotal matches 8+ digit numbers', () => {
      const regex = new RegExp(PREDEFINED_PATTERNS.pivotal, 'g');
      expect('#12345678'.match(regex)).toEqual(['#12345678']);
      expect('#1234567'.match(regex)).toBeNull(); // 7 digits - no match
    });
  });
});

describe('DEFAULT_PATTERN', () => {
  it('is jira pattern', () => {
    expect(DEFAULT_PATTERN.name).toBe('jira');
    expect(DEFAULT_PATTERN.enabled).toBe(true);
  });
});

describe('getPatternByName', () => {
  it('returns pattern for known name', () => {
    expect(getPatternByName('jira')).toBe(PREDEFINED_PATTERNS.jira);
    expect(getPatternByName('github')).toBe(PREDEFINED_PATTERNS.github);
  });

  it('returns null for unknown name', () => {
    expect(getPatternByName('unknown')).toBeNull();
  });
});
