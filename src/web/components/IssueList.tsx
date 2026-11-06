import { useState } from 'react';
import type { ValidationIssue } from '../../core/index';

export function IssueList({
  issues,
  onSelect,
}: {
  issues: ValidationIssue[];
  onSelect?: (issue: ValidationIssue) => void;
}) {
  const [filter, setFilter] = useState('');
  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? issues.filter((issue) =>
        [issue.code, issue.message, issue.path]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)),
      )
    : issues;

  if (issues.length === 0) {
    return <p className="muted">没有校验问题。</p>;
  }

  return (
    <div className="issue-list">
      <input
        aria-label="过滤校验问题"
        placeholder="按 code / message / path 过滤"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <ul>
        {visible.map((issue, index) => (
          <li key={`${issue.code}-${index}`}>
            <button
              type="button"
              className={`issue issue-${issue.severity}`}
              onClick={() => onSelect?.(issue)}
            >
              <span className="issue-severity">{issue.severity}</span>
              <span className="issue-code">{issue.code}</span>
              <span className="issue-message">{issue.message}</span>
              {issue.path ? <span className="issue-path">{issue.path}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
