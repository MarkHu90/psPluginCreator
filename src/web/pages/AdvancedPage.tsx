import { useState } from 'react';
import type { PluginSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';

export function AdvancedPage() {
  const spec = useProjectStore((store) => store.spec);
  const replaceSpec = useProjectStore((store) => store.replaceSpec);
  const [text, setText] = useState(() => JSON.stringify(spec, null, 2));
  const [error, setError] = useState('');

  if (!spec) return null;

  function apply(next: string) {
    setText(next);
    try {
      const parsed = JSON.parse(next) as PluginSpec;
      replaceSpec(parsed);
      setError('');
    } catch (cause) {
      setError(`JSON 无效：${cause instanceof Error ? cause.message : ''}`);
    }
  }

  return (
    <section>
      <h2>高级 JSON</h2>
      <p className="muted">
        这里可以编辑整份 spec，包括 PowerQuery、权限映射、wildcards 和 MessageKeys。解析失败不会保存。
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      <label className="field">
        <span>Spec JSON</span>
        <textarea
          aria-label="Spec JSON"
          rows={30}
          value={text}
          onChange={(event) => apply(event.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={() => {
          const formatted = JSON.stringify(JSON.parse(text), null, 2);
          setText(formatted);
          setError('');
        }}
      >
        格式化
      </button>
    </section>
  );
}
