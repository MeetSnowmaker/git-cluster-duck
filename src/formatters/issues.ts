import { Formatter } from './types.js';

/**
 * Issues text - one issue per line, sorted
 */
export const issuesTextFormatter: Formatter = ({ issues }) => {
  return issues.join('\n');
};

/**
 * Issues JSON - sorted array
 */
export const issuesJsonFormatter: Formatter = ({ issues }) => {
  return JSON.stringify(issues, null, 2);
};

/**
 * Issues Markdown - list of issues
 */
export const issuesMdFormatter: Formatter = ({ issues }) => {
  if (issues.length === 0) {
    return '## Issues\n\nNo issues found.\n';
  }

  const lines: string[] = ['## Issues', ''];

  for (const issue of issues) {
    lines.push(`- ${issue}`);
  }

  lines.push('');
  return lines.join('\n');
};
