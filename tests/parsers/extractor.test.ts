import { describe, it, expect } from 'vitest';
import { extractIssuesFromMessage, extractIssuesFromCommits, getAllUniqueIssues } from '../../src/parsers/extractor.js';
import { PREDEFINED_PATTERNS, TicketPattern } from '../../src/parsers/patterns.js';
import { createMockCommit } from '../setup.js';

const jiraPattern: TicketPattern = {
  name: 'jira',
  regex: PREDEFINED_PATTERNS.jira,
  enabled: true,
};

const githubPattern: TicketPattern = {
  name: 'github',
  regex: PREDEFINED_PATTERNS.github,
  enabled: true,
};

describe('extractIssuesFromMessage', () => {
  it('extracts Jira-style tickets', () => {
    const message = 'feat: Add login PROJ-123';
    const issues = extractIssuesFromMessage(message, [jiraPattern]);
    expect(issues).toEqual(['PROJ-123']);
  });

  it('extracts multiple tickets', () => {
    const message = 'fix: Resolve PROJ-123 and PROJ-456';
    const issues = extractIssuesFromMessage(message, [jiraPattern]);
    expect(issues).toEqual(['PROJ-123', 'PROJ-456']);
  });

  it('extracts GitHub-style issues', () => {
    const message = 'fix: Close #123 and #456';
    const issues = extractIssuesFromMessage(message, [githubPattern]);
    expect(issues).toEqual(['#123', '#456']);
  });

  it('extracts mixed patterns', () => {
    const message = 'feat: Implement PROJ-123 for #456';
    const issues = extractIssuesFromMessage(message, [jiraPattern, githubPattern]);
    expect(issues).toEqual(['#456', 'PROJ-123']);
  });

  it('returns empty array when no issues found', () => {
    const message = 'chore: Update dependencies';
    const issues = extractIssuesFromMessage(message, [jiraPattern]);
    expect(issues).toEqual([]);
  });

  it('deduplicates issues', () => {
    const message = 'fix: PROJ-123 related to PROJ-123';
    const issues = extractIssuesFromMessage(message, [jiraPattern]);
    expect(issues).toEqual(['PROJ-123']);
  });

  it('sorts issues alphabetically', () => {
    const message = 'fix: ZZZ-999 and AAA-111';
    const issues = extractIssuesFromMessage(message, [jiraPattern]);
    expect(issues).toEqual(['AAA-111', 'ZZZ-999']);
  });

  it('skips disabled patterns', () => {
    const disabledPattern: TicketPattern = { ...jiraPattern, enabled: false };
    const message = 'feat: Add PROJ-123';
    const issues = extractIssuesFromMessage(message, [disabledPattern]);
    expect(issues).toEqual([]);
  });

  it('handles lowercase tickets', () => {
    const message = 'fix: proj-123 lowercase';
    const issues = extractIssuesFromMessage(message, [jiraPattern]);
    expect(issues).toEqual(['proj-123']);
  });
});

describe('extractIssuesFromCommits', () => {
  it('attaches issues to commits', () => {
    const commits = [
      createMockCommit({ message: 'feat: Add PROJ-123' }),
      createMockCommit({ message: 'fix: Fix PROJ-456' }),
    ];
    const result = extractIssuesFromCommits(commits, [jiraPattern]);

    expect(result[0].issues).toEqual(['PROJ-123']);
    expect(result[1].issues).toEqual(['PROJ-456']);
  });

  it('handles commits without issues', () => {
    const commits = [
      createMockCommit({ message: 'chore: Update deps' }),
    ];
    const result = extractIssuesFromCommits(commits, [jiraPattern]);

    expect(result[0].issues).toEqual([]);
  });
});

describe('getAllUniqueIssues', () => {
  it('collects all unique issues from commits', () => {
    const commits = [
      createMockCommit({ issues: ['PROJ-123', 'PROJ-456'] }),
      createMockCommit({ issues: ['PROJ-456', 'PROJ-789'] }),
      createMockCommit({ issues: [] }),
    ];
    const issues = getAllUniqueIssues(commits);

    expect(issues).toEqual(['PROJ-123', 'PROJ-456', 'PROJ-789']);
  });

  it('returns empty array when no issues', () => {
    const commits = [
      createMockCommit({ issues: [] }),
    ];
    const issues = getAllUniqueIssues(commits);

    expect(issues).toEqual([]);
  });
});
