import { Formatter } from './types.js';

/**
 * Concat text - first line + issues
 */
export const concatTextFormatter: Formatter = ({ commits }) => {
  const lines: string[] = [];

  for (const commit of commits) {
    const issueTag = commit.issues.length > 0 ? ` [${commit.issues.join(', ')}]` : '';
    lines.push(`${commit.subject}${issueTag}`);
  }

  return lines.join('\n');
};

/**
 * Concat JSON - simplified with first line and issues
 */
export const concatJsonFormatter: Formatter = ({ commits, issues }) => {
  return JSON.stringify(
    {
      entries: commits.map((c) => ({
        message: c.subject,
        issues: c.issues,
      })),
      allIssues: issues,
    },
    null,
    2
  );
};

/**
 * Concat Markdown - clean list with issues inline
 */
export const concatMdFormatter: Formatter = ({ commits, meta }) => {
  const lines: string[] = [
    `## Changelog: ${meta.targetBranch} → ${meta.baseBranch}`,
    '',
  ];

  for (const commit of commits) {
    const issueTag = commit.issues.length > 0 ? ` ${commit.issues.map((i) => `\`${i}\``).join(' ')}` : '';
    lines.push(`- ${commit.subject}${issueTag}`);
  }

  lines.push('');
  return lines.join('\n');
};
