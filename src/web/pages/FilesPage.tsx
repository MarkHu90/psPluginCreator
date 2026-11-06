import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useProjectStore } from '../store/projectStore';

interface FileInfo {
  path: string;
  size: number;
  updatedAt: string;
}

export function FilesPage() {
  const project = useProjectStore((store) => store.project);
  const spec = useProjectStore((store) => store.spec);
  const update = useProjectStore((store) => store.update);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!project) return;
    const result = await api.listFiles(project.key);
    setFiles(result.files);
  }, [project]);

  useEffect(() => {
    void refresh().catch((cause: Error) => setError(cause.message));
  }, [refresh]);

  if (!project || !spec) return null;

  const upload = async (list: FileList | null) => {
    if (!list) return;
    setError('');
    try {
      for (const file of Array.from(list)) {
        const path = (file as File & { webkitRelativePath?: string })
          .webkitRelativePath || file.name;
        await api.uploadFile(project.key, file, path);
        const current = useProjectStore.getState().spec;
        if (current && !current.rawFiles.some((raw) => raw.path === path)) {
          update('rawFiles', [...current.rawFiles, { path }]);
        }
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '上传失败');
    }
  };

  const remove = async (path: string) => {
    setError('');
    const rawPage = spec.pages.find(
      (page) => page.kind === 'raw' && page.path === path,
    );
    if (
      rawPage &&
      !window.confirm(`页面 ${rawPage.id} 引用了该文件，仍要删除？`)
    ) {
      return;
    }
    try {
      await api.deleteFile(project.key, path);
      const nextRaw = spec.rawFiles.filter((raw) => raw.path !== path);
      if (nextRaw.length !== spec.rawFiles.length) update('rawFiles', nextRaw);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败');
    }
  };

  return (
    <section>
      <h2>Raw 文件</h2>
      <p className="muted">
        上传后会加入 spec.rawFiles 并参与生成。删除会同步移除引用；raw 页面引用的文件请谨慎删除。
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      <input
        aria-label="上传文件"
        type="file"
        multiple
        onChange={(event) => void upload(event.target.files)}
      />
      <table className="grid">
        <thead>
          <tr>
            <th>路径</th>
            <th>大小</th>
            <th>更新时间</th>
            <th>引用</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const referenced = spec.rawFiles.some((raw) => raw.path === file.path);
            return (
              <tr key={file.path}>
                <td>{file.path}</td>
                <td>{file.size}</td>
                <td>{new Date(file.updatedAt).toLocaleString()}</td>
                <td>{referenced ? '已引用' : '未引用'}</td>
                <td>
                  <button type="button" onClick={() => void remove(file.path)}>
                    删除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
