export interface TicketPattern {
  name: string;
  regex: string;
  enabled: boolean;
}

export const PREDEFINED_PATTERNS: Record<string, string> = {
  jira: '[A-Za-z]+-\\d+',
  github: '#\\d+',
  gitlab: '!\\d+',
  azure: 'AB#\\d+',
  linear: '[A-Z]+-\\d+',
  youtrack: '[A-Z]+-\\d+',
  pivotal: '#\\d{8,}',
  shorthand: '[A-Za-z]+-\\d+|#\\d+',
};

export const DEFAULT_PATTERN: TicketPattern = {
  name: 'jira',
  regex: PREDEFINED_PATTERNS.jira,
  enabled: true,
};

export function getPatternByName(name: string): string | null {
  return PREDEFINED_PATTERNS[name] || null;
}
