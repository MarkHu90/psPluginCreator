import type { ValidationIssue } from '../../core/index';

const ROUTES: Record<string, string> = {
  plugin: 'overview',
  table: 'tables',
  page: 'pages',
  navigation: 'navigation',
  powerQuery: 'advanced',
  accessRequest: 'advanced',
  permissionMapping: 'advanced',
  wildcard: 'advanced',
  messageKey: 'advanced',
  raw: 'files',
  generatedFile: 'build',
  zip: 'build',
};

export function issueRoute(issue: ValidationIssue): string {
  return ROUTES[issue.target?.type ?? ''] ?? 'build';
}
