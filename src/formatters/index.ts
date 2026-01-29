import { Formatter, FormatterContext } from './types.js';
import { textFormatter, jsonFormatter, mdFormatter } from './raw.js';
import { concatTextFormatter, concatJsonFormatter, concatMdFormatter } from './concat.js';
import { issuesTextFormatter, issuesJsonFormatter, issuesMdFormatter } from './issues.js';
import { summaryTextFormatter, summaryJsonFormatter, summaryMdFormatter } from './summary.js';
import { verboseTextFormatter, verboseJsonFormatter, verboseMdFormatter } from './verbose.js';

export const FORMATTERS: Record<string, { formatter: Formatter; extension: string }> = {
  'raw-text': { formatter: textFormatter, extension: 'txt' },
  'raw-json': { formatter: jsonFormatter, extension: 'json' },
  'raw-md': { formatter: mdFormatter, extension: 'md' },
  'concat-text': { formatter: concatTextFormatter, extension: 'txt' },
  'concat-json': { formatter: concatJsonFormatter, extension: 'json' },
  'concat-md': { formatter: concatMdFormatter, extension: 'md' },
  'issues-text': { formatter: issuesTextFormatter, extension: 'txt' },
  'issues-json': { formatter: issuesJsonFormatter, extension: 'json' },
  'issues-md': { formatter: issuesMdFormatter, extension: 'md' },
  'summary-text': { formatter: summaryTextFormatter, extension: 'txt' },
  'summary-json': { formatter: summaryJsonFormatter, extension: 'json' },
  'summary-md': { formatter: summaryMdFormatter, extension: 'md' },
  'verbose-text': { formatter: verboseTextFormatter, extension: 'txt' },
  'verbose-json': { formatter: verboseJsonFormatter, extension: 'json' },
  'verbose-md': { formatter: verboseMdFormatter, extension: 'md' },
};

export const ALL_FORMAT_NAMES = Object.keys(FORMATTERS);

export function formatOutput(name: string, ctx: FormatterContext): string {
  const entry = FORMATTERS[name];
  if (!entry) {
    throw new Error(`Unknown format: ${name}`);
  }
  return entry.formatter(ctx);
}

export function getExtension(name: string): string {
  const entry = FORMATTERS[name];
  return entry?.extension || 'txt';
}

export * from './types.js';
