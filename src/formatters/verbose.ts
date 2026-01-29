import { Formatter } from './types.js';
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
 * Verbose text - full commit details grouped by issue
 */
export const verboseTextFormatter: Formatter = ({ commits }) => {
  const grouped = groupCommitsByIssue(commits);
  const lines: string[] = [];

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '_noIssue') return 1;
    if (b === '_noIssue') return -1;
    return a.localeCompare(b);
  });

  for (const issue of sortedKeys) {
    const displayName = issue === '_noIssue' ? 'No Issue' : issue;
    lines.push(displayName);
    lines.push('');

    for (const commit of grouped[issue]) {
      lines.push(`  ${commit.hash}`);
      lines.push(`  Author: ${commit.author} <${commit.authorEmail}>`);
      lines.push(`  Date: ${commit.date}`);
      lines.push('');
      lines.push(`  ${commit.subject}`);
      if (commit.body) {
        lines.push('');
        for (const bodyLine of commit.body.split('\n')) {
          lines.push(`  ${bodyLine}`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
};

/**
 * Verbose JSON - full commit objects grouped by issue
 */
export const verboseJsonFormatter: Formatter = ({ commits }) => {
  const grouped = groupCommitsByIssue(commits);

  const result: Record<string, Array<{
    hash: string;
    author: string;
    date: string;
    message: string;
  }>> = {};

  for (const [issue, issueCommits] of Object.entries(grouped)) {
    result[issue] = issueCommits.map((c) => ({
      hash: c.hash,
      author: `${c.author} <${c.authorEmail}>`,
      date: c.date,
      message: c.message,
    }));
  }

  return JSON.stringify(result, null, 2);
};

/**
 * Verbose Markdown - full commit details in markdown
 */
export const verboseMdFormatter: Formatter = ({ commits }) => {
  const grouped = groupCommitsByIssue(commits);
  const lines: string[] = ['## Issue Summary (Verbose)', ''];

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
      lines.push(`#### \`${commit.hashShort}\``);
      lines.push('');
      lines.push(`- **Author:** ${commit.author} <${commit.authorEmail}>`);
      lines.push(`- **Date:** ${commit.date}`);
      lines.push('');
      lines.push(commit.subject);
      if (commit.body) {
        lines.push('');
        lines.push(commit.body);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
};
