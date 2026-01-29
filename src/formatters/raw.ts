import { Formatter } from './types.js';

/**
 * Raw text - full git log style output
 */
export const textFormatter: Formatter = ({ commits, meta }) => {
  const lines: string[] = [
    `Changelog: ${meta.targetBranch} → ${meta.baseBranch}`,
    `Commits: ${meta.totalCommits}`,
    '',
  ];

  for (const commit of commits) {
    lines.push(`commit ${commit.hash}`);
    lines.push(`Author: ${commit.author} <${commit.authorEmail}>`);
    lines.push(`Date:   ${commit.date}`);
    lines.push('');
    lines.push(`    ${commit.subject}`);
    if (commit.body) {
      for (const bodyLine of commit.body.split('\n')) {
        lines.push(`    ${bodyLine}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Raw JSON - full commit data
 */
export const jsonFormatter: Formatter = ({ commits, issues, meta }) => {
  return JSON.stringify(
    {
      meta,
      issues,
      commits: commits.map((c) => ({
        hash: c.hash,
        hashShort: c.hashShort,
        author: c.author,
        authorEmail: c.authorEmail,
        date: c.date,
        subject: c.subject,
        body: c.body,
        message: c.message,
        issues: c.issues,
      })),
    },
    null,
    2
  );
};

/**
 * Raw Markdown - full changelog
 */
export const mdFormatter: Formatter = ({ commits, issues, meta }) => {
  const lines: string[] = [
    `# Changelog: ${meta.targetBranch} → ${meta.baseBranch}`,
    '',
    `**Commits:** ${meta.totalCommits}`,
    '',
    '## Commits',
    '',
  ];

  for (const commit of commits) {
    lines.push(`### \`${commit.hashShort}\` ${commit.subject}`);
    lines.push('');
    lines.push(`- **Author:** ${commit.author} <${commit.authorEmail}>`);
    lines.push(`- **Date:** ${commit.date}`);
    if (commit.issues.length > 0) {
      lines.push(`- **Issues:** ${commit.issues.map((i) => `\`${i}\``).join(', ')}`);
    }
    if (commit.body) {
      lines.push('');
      lines.push(commit.body);
    }
    lines.push('');
  }

  if (issues.length > 0) {
    lines.push('## Issues Referenced');
    lines.push('');
    for (const issue of issues) {
      lines.push(`- ${issue}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};
