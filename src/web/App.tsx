import { useMemo, useState } from 'react';
import type { ValidationIssue } from '../core/index';
import { sampleSpec } from './sample';
import './styles.css';

interface ValidateResponse {
  issues: ValidationIssue[];
  errors: number;
  warnings: number;
}

export function App() {
  const [specText, setSpecText] = useState(() =>
    JSON.stringify(sampleSpec, null, 2),
  );
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [summary, setSummary] = useState({ errors: 0, warnings: 0 });
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState('');
  const [filter, setFilter] = useState('');

  async function validate() {
    setParseError('');
    let spec: unknown;
    try {
      spec = JSON.parse(specText);
    } catch (error) {
      setParseError(`JSON 解析失败：${(error as Error).message}`);
      setIssues(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec }),
      });
      const data = (await response.json()) as ValidateResponse & {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(data.error?.message ?? response.statusText);
      }
      setIssues(data.issues);
      setSummary({ errors: data.errors, warnings: data.warnings });
    } catch (error) {
      setParseError(`请求失败：${(error as Error).message}`);
      setIssues(null);
    } finally {
      setLoading(false);
    }
  }

  async function openFile(file: File | undefined) {
    if (!file) return;
    setSpecText(await file.text());
  }

  const visibleIssues = useMemo(() => {
    if (!issues) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return issues;
    return issues.filter((issue) =>
      [issue.code, issue.message, issue.path]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [issues, filter]);

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">PowerSchool SIS</p>
          <h1>Plugin Workbench</h1>
          <p className="subtitle">
            粘贴或打开 <code>plugin.json</code>，运行校验规则，查看错误与警告。
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={validate} disabled={loading}>
            {loading ? '校验中…' : '运行校验'}
          </button>
          <button
            className="ghost"
            onClick={() => {
              setSpecText(JSON.stringify(sampleSpec, null, 2));
              setIssues(null);
              setParseError('');
            }}
          >
            载入示例
          </button>
          <label className="file-button">
            打开 JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => openFile(event.target.files?.[0])}
            />
          </label>
        </div>
      </header>

      <section className="workspace">
        <div className="panel editor-panel">
          <div className="panel-title">
            <h2>Spec</h2>
            <span className="muted">plugin.json</span>
          </div>
          <textarea
            spellCheck={false}
            value={specText}
            onChange={(event) => setSpecText(event.target.value)}
          />
        </div>

        <div className="panel results-panel">
          <div className="panel-title">
            <h2>校验结果</h2>
            <span className="muted">
              {issues ? `${summary.errors} 错误 / ${summary.warnings} 警告` : '尚未运行'}
            </span>
          </div>

          {parseError ? <div className="banner error">{parseError}</div> : null}

          {issues ? (
            <>
              <div className="result-toolbar">
                <input
                  type="search"
                  placeholder="按 code、message、path 过滤"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
                <div className="summary-chips">
                  <span className="chip error">{summary.errors} errors</span>
                  <span className="chip warning">{summary.warnings} warnings</span>
                </div>
              </div>

              {visibleIssues.length === 0 ? (
                <div className="empty">
                  {issues.length === 0
                    ? '校验通过，没有发现问题。'
                    : '没有匹配当前过滤条件的问题。'}
                </div>
              ) : (
                <ul className="issue-list">
                  {visibleIssues.map((issue, index) => (
                    <li
                      className={`issue ${issue.severity}`}
                      key={`${issue.code}-${issue.path ?? ''}-${index}`}
                    >
                      <div className="issue-head">
                        <span className={`badge ${issue.severity}`}>
                          {issue.severity}
                        </span>
                        <code>{issue.code}</code>
                        {issue.path ? <span className="path">{issue.path}</span> : null}
                      </div>
                      <p>{issue.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="empty">
              点击「运行校验」后，这里会显示规则命中情况。
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
