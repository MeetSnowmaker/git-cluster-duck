import { Formatter, FormatterContext } from './types.js';
import { Commit } from '../git/types.js';

interface GroupedCommits {
  [issue: string]: Commit[];
}

function groupCommitsByIssue(commits: Commit[]): GroupedCommits {
  const grouped: GroupedCommits = {};

  for (const commit of commits) {
    if (commit.issues.length === 0) {
      if (!grouped['_noIssue']) {
        grouped['_noIssue'] = [];
      }
      grouped['_noIssue'].push(commit);
    } else {
      for (const issue of commit.issues) {
        if (!grouped[issue]) {
          grouped[issue] = [];
        }
        grouped[issue].push(commit);
      }
    }
  }

  return grouped;
}

/**
 * Summary text - grouped by issue with first line + hash
 */
export const summaryTextFormatter: Formatter = ({ commits }) => {
  const grouped = groupCommitsByIssue(commits);
  const lines: string[] = [];

  // Sort issues alphabetically, _noIssue last
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '_noIssue') return 1;
    if (b === '_noIssue') return -1;
    return a.localeCompare(b);
  });

  for (const issue of sortedKeys) {
    const displayName = issue === '_noIssue' ? 'No Issue' : issue;
    lines.push(displayName);

    for (const commit of grouped[issue]) {
      lines.push(`  ${commit.hashShort} - ${commit.subject}`);
    }

    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Summary JSON - issues as keys with commit arrays
 */
export const summaryJsonFormatter: Formatter = ({ commits }) => {
  const grouped = groupCommitsByIssue(commits);

  const result: Record<string, Array<{ hash: string; message: string }>> = {};

  for (const [issue, issueCommits] of Object.entries(grouped)) {
    result[issue] = issueCommits.map((c) => ({
      hash: c.hashShort,
      message: c.subject,
    }));
  }

  return JSON.stringify(result, null, 2);
};

/**
 * Summary Markdown - nested list grouped by issue
 */
export const summaryMdFormatter: Formatter = ({ commits }) => {
  const grouped = groupCommitsByIssue(commits);
  const lines: string[] = ['## Issue Summary', ''];

  // Sort issues alphabetically, _noIssue last
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '_noIssue') return 1;
    if (b === '_noIssue') return -1;
    return a.localeCompare(b);
  });

  for (const issue of sortedKeys) {
    const displayName = issue === '_noIssue' ? 'No Issue' : issue;
    lines.push(`### ${displayName}`);
    lines.push('');

    for (const commit of grouped[issue]) {
      lines.push(`- \`${commit.hashShort}\` ${commit.subject}`);
    }

    lines.push('');
  }

  return lines.join('\n');
};
