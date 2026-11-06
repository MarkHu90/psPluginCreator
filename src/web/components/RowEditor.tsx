import type { ReactNode } from 'react';

export function RowEditor<T>({
  rows,
  onChange,
  createRow,
  addLabel,
  children,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  createRow: () => T;
  addLabel: string;
  children: (row: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  function updateAt(index: number, patch: Partial<T>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="row-editor">
      {rows.map((row, index) => (
        <div className="row" key={index}>
          <div className="row-fields">
            {children(row, (patch) => updateAt(index, patch))}
          </div>
          <div className="row-actions">
            <button type="button" aria-label="上移" onClick={() => move(index, -1)}>
              ↑
            </button>
            <button type="button" aria-label="下移" onClick={() => move(index, 1)}>
              ↓
            </button>
            <button
              type="button"
              aria-label="删除"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, createRow()])}>
        {addLabel}
      </button>
    </div>
  );
}
