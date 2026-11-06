import { Navigate, Route, Routes } from 'react-router-dom';
import { OverviewPage } from '../pages/OverviewPage';
import { ProjectListPage } from '../pages/ProjectListPage';
import { TablesPage } from '../pages/TablesPage';
import { ProjectLayout } from './ProjectLayout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects/:key" element={<ProjectLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="tables" element={<TablesPage />} />
      </Route>
    </Routes>
  );
}
