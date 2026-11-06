import { Route, Routes } from 'react-router-dom';
import { ProjectListPage } from '../pages/ProjectListPage';
import { ProjectLayout } from './ProjectLayout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects/:key" element={<ProjectLayout />}>
        <Route
          index
          element={<p className="muted">从左侧选择一个配置页。</p>}
        />
      </Route>
    </Routes>
  );
}
