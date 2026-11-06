import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type ProjectSummary } from '../api';

export function ProjectListPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [publisherName, setPublisherName] = useState('');
  const [publisherEmail, setPublisherEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const result = await api.listProjects();
    setProjects(result.projects);
  }, []);

  useEffect(() => {
    void refresh().catch((cause: Error) => setError(cause.message));
  }, [refresh]);

  async function create() {
    setError('');
    try {
      const result = await api.createProject({
        key: key.trim() || undefined,
        name,
        publisher:
          publisherName.trim() || publisherEmail.trim()
            ? { name: publisherName, email: publisherEmail }
            : undefined,
      });
      setOpen(false);
      await refresh();
      navigate(`/projects/${result.project.key}/overview`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建失败');
    }
  }

  async function remove(projectKey: string) {
    const typed = window.prompt(
      `删除工程 ${projectKey}？此操作不可撤销。输入 key 以确认：`,
    );
    if (typed !== projectKey) return;
    await api.deleteProject(projectKey);
    await refresh();
  }

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">PowerSchool SIS</p>
          <h1>插件平台</h1>
          <p className="subtitle">创建、配置并导出 PowerSchool 定制化插件</p>
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          新建工程
        </button>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      {projects.length === 0 ? (
        <p className="muted">还没有工程。点击「新建工程」开始。</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>名称</th>
              <th>Key</th>
              <th>版本</th>
              <th>更新时间</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.key}>
                <td>{project.name}</td>
                <td>{project.key}</td>
                <td>{project.version}</td>
                <td>{new Date(project.updatedAt).toLocaleString()}</td>
                <td>
                  <Link to={`/projects/${project.key}/overview`}>打开</Link>{' '}
                  <button type="button" onClick={() => void remove(project.key)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open ? (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-label="新建工程">
            <h2>新建工程</h2>
            <label>
              Key（可空）
              <input value={key} onChange={(event) => setKey(event.target.value)} />
            </label>
            <label>
              名称
              <input
                aria-label="名称"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              发布者名称
              <input
                value={publisherName}
                onChange={(event) => setPublisherName(event.target.value)}
              />
            </label>
            <label>
              发布者邮箱
              <input
                value={publisherEmail}
                onChange={(event) => setPublisherEmail(event.target.value)}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={() => setOpen(false)}>
                取消
              </button>
              <button type="button" onClick={() => void create()} disabled={!name.trim()}>
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
