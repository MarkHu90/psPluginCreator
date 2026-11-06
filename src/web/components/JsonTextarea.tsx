import { useEffect, useRef, useState } from 'react';

export function JsonTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [text, setText] = useState(() =>
    value === undefined ? '' : JSON.stringify(value, null, 2),
  );
  const [error, setError] = useState('');
  const lastEmitted = useRef<unknown>(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value === undefined ? '' : JSON.stringify(value, null, 2));
    }
  }, [value]);

  return (
    <label className="field">
      <span>{label} (JSON)</span>
      <textarea
        aria-label={label}
        rows={3}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (!next.trim()) {
            lastEmitted.current = undefined;
            setError('');
            onChange(undefined);
            return;
          }
          try {
            const parsed = JSON.parse(next) as unknown;
            lastEmitted.current = parsed;
            onChange(parsed);
            setError('');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'JSON 无效');
          }
        }}
      />
      {error ? <span className="error-text">{error}</span> : null}
    </label>
  );
}
