import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IssueList } from '../components/IssueList';
import { useProjectStore } from '../store/projectStore';
import { issueRoute } from './issueRoute';

export function ValidationDrawer() {
  const issues = useProjectStore((store) => store.issues);
  const project = useProjectStore((store) => store.project);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const errors = issues.filter((issue) => issue.severity === 'error').length;

  return (
    <>
      <button
        type="button"
        className={`issues-toggle ${errors ? 'has-errors' : ''}`}
        onClick={() => setOpen((value) => !value)}
      >
        校验：{errors} 错误 / {issues.length - errors} 警告
      </button>
      {open ? (
        <aside className="validation-drawer">
          <header>
            <h2>校验结果</h2>
            <button type="button" onClick={() => setOpen(false)}>
              关闭
            </button>
          </header>
          <IssueList
            issues={issues}
            onSelect={(issue) => {
              if (!project) return;
              navigate(`/projects/${project.key}/${issueRoute(issue)}`);
              setOpen(false);
            }}
          />
        </aside>
      ) : null}
    </>
  );
}
