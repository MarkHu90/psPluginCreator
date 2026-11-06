import { Navigate, Route, Routes } from 'react-router-dom';
import { AdvancedPage } from '../pages/AdvancedPage';
import { BuildPage } from '../pages/BuildPage';
import { FilesPage } from '../pages/FilesPage';
import { NavigationPage } from '../pages/NavigationPage';
import { OverviewPage } from '../pages/OverviewPage';
import { PagesPage } from '../pages/PagesPage';
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
        <Route path="pages" element={<PagesPage />} />
        <Route path="navigation" element={<NavigationPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="advanced" element={<AdvancedPage />} />
        <Route path="build" element={<BuildPage />} />
      </Route>
    </Routes>
  );
}
