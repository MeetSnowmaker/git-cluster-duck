import { Commit } from '../git/types.js';
import { TicketPattern } from './patterns.js';

export function extractIssuesFromMessage(
  message: string,
  patterns: TicketPattern[]
): string[] {
  const issues: Set<string> = new Set();

  for (const pattern of patterns) {
    if (!pattern.enabled) continue;

    try {
      const regex = new RegExp(pattern.regex, 'g');
      const matches = message.match(regex);

      if (matches) {
        for (const match of matches) {
          issues.add(match);
        }
      }
    } catch {
      // Invalid regex, skip
      console.warn(`⚠ Invalid regex pattern: ${pattern.name}`);
    }
  }

  // Return sorted unique issues
  return Array.from(issues).sort();
}

export function extractIssuesFromCommits(
  commits: Commit[],
  patterns: TicketPattern[]
): Commit[] {
  return commits.map((commit) => ({
    ...commit,
    issues: extractIssuesFromMessage(commit.message, patterns),
  }));
}

export function getAllUniqueIssues(commits: Commit[]): string[] {
  const allIssues: Set<string> = new Set();

  for (const commit of commits) {
    for (const issue of commit.issues) {
      allIssues.add(issue);
    }
  }

  return Array.from(allIssues).sort();
}
