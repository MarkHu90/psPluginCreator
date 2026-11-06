import type { LocalizedText } from '../../core/index';

export function LocalizedTextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
}) {
  return (
    <div className="localized">
      <label className="field">
        <span>{label} (en)</span>
        <input
          aria-label={`${label} (en)`}
          value={value.en}
          onChange={(event) => onChange({ ...value, en: event.target.value })}
        />
      </label>
      <label className="field">
        <span>{label} (zh)</span>
        <input
          aria-label={`${label} (zh)`}
          placeholder="中文（可选）"
          value={value.zh ?? ''}
          onChange={(event) => onChange({ ...value, zh: event.target.value })}
        />
      </label>
    </div>
  );
}
