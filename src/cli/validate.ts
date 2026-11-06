import { readFile } from 'node:fs/promises';
import { validateSpec, type ValidationIssue } from '../core/index';

export interface ValidateFileResult {
  issues: ValidationIssue[];
  errors: number;
  warnings: number;
}

function flattenNavigation(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [entry];
      const children = (entry as { children?: unknown[] }).children ?? [];
      return [entry, ...flattenNavigation(children)];
    });
  }
  if (value && typeof value === 'object') {
    const pages = (value as { pages?: unknown[] }).pages;
    if (Array.isArray(pages)) return flattenNavigation(pages);
  }
  return [];
}

export async function validateSpecFile(
  specPath: string,
  previousPath?: string,
): Promise<ValidateFileResult> {
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  const previousNavigation = previousPath
    ? flattenNavigation(JSON.parse(await readFile(previousPath, 'utf8')))
    : undefined;

  const issues = validateSpec(spec, {
    previousNavigation: previousNavigation as never,
  });
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
  };
}

export function formatIssues(issues: ValidationIssue[]): string {
  if (!issues.length) return 'No validation issues.';
  return issues
    .map(
      (issue) =>
        `${issue.severity.toUpperCase()} ${issue.code}${issue.path ? ` ${issue.path}` : ''}\n  ${issue.message}`,
    )
    .join('\n');
}
