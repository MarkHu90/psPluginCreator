import type { ValidationIssue } from '../../core/index';

export function SectionIssues({ issues }: { issues: ValidationIssue[] }) {
  const visible = issues.filter((issue) => issue.severity === 'error');
  if (visible.length === 0) return null;
  return (
    <ul className="section-issues">
      {visible.map((issue, index) => (
        <li key={`${issue.code}-${index}`}>
          <strong>{issue.code}</strong> {issue.message}
        </li>
      ))}
    </ul>
  );
}
