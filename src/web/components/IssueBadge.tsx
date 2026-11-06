import type { ValidationIssue } from '../../core/index';

export function IssueBadge({
  issues,
  type,
  id,
}: {
  issues: ValidationIssue[];
  type: string;
  id: string;
}) {
  const count = issues.filter(
    (issue) =>
      issue.severity === 'error' &&
      issue.target?.type === type &&
      issue.target?.id === id,
  ).length;
  if (!count) return null;
  return (
    <span className="issue-badge" title={`${count} 个校验问题`}>
      {count}
    </span>
  );
}
