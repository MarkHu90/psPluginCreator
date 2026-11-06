import { useEffect } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ConflictDialog } from '../components/ConflictDialog';
import { SaveStatus } from '../components/SaveStatus';
import { useProjectStore } from '../store/projectStore';
import { ValidationDrawer } from './ValidationDrawer';

const LINKS = [
  ['overview', '插件信息'],
  ['tables', '表与字段'],
  ['pages', '页面'],
  ['navigation', '导航'],
  ['files', 'Raw 文件'],
  ['advanced', '高级 JSON'],
  ['build', '构建'],
] as const;

export function ProjectLayout() {
  const { key = '' } = useParams();
  const load = useProjectStore((store) => store.load);
  const project = useProjectStore((store) => store.project);
  const loading = useProjectStore((store) => store.loading);
  const notFound = useProjectStore((store) => store.notFound);
  const validateNow = useProjectStore((store) => store.validateNow);
  const saveNow = useProjectStore((store) => store.saveNow);
  const saveState = useProjectStore((store) => store.saveState);
  const conflict = useProjectStore((store) => store.conflict);

  useEffect(() => {
    if (key) void load(key);
  }, [key, load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveNow]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving' || conflict) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState, conflict]);

  if (loading) return <main className="app">加载中…</main>;
  if (notFound || !project) {
    return (
      <main className="app">
        <p>工程不存在。</p>
        <Link to="/">返回工程列表</Link>
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="back-link">
          ← 工程列表
        </Link>
        <h1>{project.key}</h1>
        <nav>
          {LINKS.map(([slug, label]) => (
            <NavLink
              key={slug}
              to={`/projects/${project.key}/${slug}`}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <SaveStatus />
          <button type="button" onClick={() => void validateNow()}>
            重新校验
          </button>
          <Link to={`/projects/${project.key}/build`} className="button-link">
            构建
          </Link>
          <ValidationDrawer />
        </header>
        <Outlet />
      </section>
      <ConflictDialog />
    </div>
  );
}
