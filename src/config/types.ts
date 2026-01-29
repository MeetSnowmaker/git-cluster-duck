import { TicketPattern } from '../parsers/patterns.js';

export interface Config {
  repoName: string;
  baseBranch: string;
  defaultOutputs: string[];
  ticketPatterns: TicketPattern[];
  outputDir: string;
  excludeAuthors: string[];
  excludePatterns: string[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CONFIG: Omit<Config, 'repoName' | 'baseBranch' | 'createdAt' | 'updatedAt'> = {
  defaultOutputs: ['all'],
  ticketPatterns: [
    { name: 'jira', regex: '[A-Za-z]+-\\d+', enabled: true },
  ],
  outputDir: './temp/gcd/{date}/{time}',
  excludeAuthors: [],
  excludePatterns: [],
};

export const OUTPUT_FORMATS = [
  'text',
  'json',
  'md',
  'concat-text',
  'concat-json',
  'concat-md',
  'issues-text',
  'issues-json',
  'issues-md',
  'summary-text',
  'summary-json',
  'summary-md',
  'verbose-text',
  'verbose-json',
  'verbose-md',
] as const;

export type OutputFormat = typeof OUTPUT_FORMATS[number];
