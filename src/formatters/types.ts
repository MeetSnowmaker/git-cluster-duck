import { Commit, GitMeta } from '../git/types.js';

export interface FormatterContext {
  commits: Commit[];
  issues: string[];
  meta: GitMeta;
}

export type Formatter = (ctx: FormatterContext) => string;
