export interface Commit {
  hash: string;
  hashShort: string;
  author: string;
  authorEmail: string;
  date: string;
  message: string;
  subject: string;
  body: string;
  issues: string[];
}

export interface GitMeta {
  repoRoot: string;
  repoName: string;
  targetBranch: string;
  baseBranch: string;
  totalCommits: number;
}
