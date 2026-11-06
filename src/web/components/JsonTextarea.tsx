import { useState } from 'react';

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
            setError('');
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(next));
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
