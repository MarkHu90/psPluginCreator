import { useEffect, useRef, useState } from 'react';
import type { PluginSpec } from '../../core/index';
import { useProjectStore } from '../store/projectStore';

function formatSpec(spec: PluginSpec): string {
  return JSON.stringify(spec, null, 2);
}

export function AdvancedPage() {
  const spec = useProjectStore((store) => store.spec);
  const replaceSpec = useProjectStore((store) => store.replaceSpec);
  const lastApplied = useRef<PluginSpec | null>(null);
  const [text, setText] = useState(() =>
    spec ? formatSpec(spec) : '',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (spec && spec !== lastApplied.current) {
      lastApplied.current = spec;
      setText(formatSpec(spec));
    }
  }, [spec]);

  if (!spec) return null;

  function apply(next: string) {
    setText(next);
    try {
      const parsed = JSON.parse(next) as unknown;
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        setError('JSON 必须是对象。');
        return;
      }
      lastApplied.current = parsed as PluginSpec;
      replaceSpec(parsed as PluginSpec);
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
          try {
            const formatted = JSON.stringify(JSON.parse(text), null, 2);
            setText(formatted);
            setError('');
          } catch (cause) {
            setError(`JSON 无效：${cause instanceof Error ? cause.message : ''}`);
          }
        }}
      >
        格式化
      </button>
    </section>
  );
}
