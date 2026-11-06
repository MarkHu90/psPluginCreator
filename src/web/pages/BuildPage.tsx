import { useEffect, useState } from 'react';
import { api, type GenerateResult } from '../api';
import { IssueList } from '../components/IssueList';
import { useProjectStore } from '../store/projectStore';

export function BuildPage() {
  const project = useProjectStore((store) => store.project);
  const issues = useProjectStore((store) => store.issues);
  const generate = useProjectStore((store) => store.generate);
  const validateNow = useProjectStore((store) => store.validateNow);
  const flushSave = useProjectStore((store) => store.flushSave);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!project) return;
    void validateNow();
  }, [project, validateNow]);

  if (!project) return null;
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  async function run() {
    setLoading(true);
    setError('');
    try {
      const ok = await flushSave();
      if (!ok) {
        setError('保存失败或存在冲突，无法生成。');
        return;
      }
      await validateNow();
      const current = useProjectStore.getState().issues;
      if (current.some((issue) => issue.severity === 'error')) {
        setError('生成失败：请先修复校验错误。');
        return;
      }
      const generated = await generate();
      setResult(generated);
      if (!generated) {
        setError('生成失败：请先修复校验错误。');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>构建</h2>
      <button type="button" onClick={() => void run()} disabled={loading || hasErrors}>
        {loading ? '生成中…' : '生成'}
      </button>
      {hasErrors ? <p className="muted">存在校验错误，修复后才能生成。</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <h3>校验结果</h3>
      <IssueList issues={issues} />

      {result ? (
        <>
          <h3>下载</h3>
          <p>
            {(['combined', 'api', 'dbsetup'] as const).map((artifact) => (
              <a key={artifact} href={api.downloadUrl(project.key, artifact)}>
                下载 {artifact}.zip
              </a>
            ))}
          </p>
          <h3>生成文件</h3>
          <ul>
            {result.files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
