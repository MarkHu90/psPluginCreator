import { useState } from 'react';
import {
  suggestNavVersion,
  type NavContextType,
  type NavEntrySpec,
  type NavFileSpec,
} from '../../core/index';
import { IssueBadge } from '../components/IssueBadge';
import { LocalizedTextInput } from '../components/LocalizedTextInput';
import { SectionIssues } from '../components/SectionIssues';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { CheckboxField } from '../components/CheckboxField';
import { JsonTextarea } from '../components/JsonTextarea';
import { useProjectStore } from '../store/projectStore';

function newNavFile(): NavFileSpec {
  return {
    filename: 'new-nav.json',
    contextType: 'main',
    entries: [],
  };
}

function newEntry(): NavEntrySpec {
  return {
    htmlID: `entry-${Date.now()}`,
    title: { en: 'New Entry' },
    sortOrder: 1,
    version: '1.0.0',
  };
}

function NavEntryEditor({
  entry,
  onChange,
  baseline,
  defaultVersion,
  depth,
}: {
  entry: NavEntrySpec;
  onChange: (entry: NavEntrySpec) => void;
  baseline: Map<string, NavEntrySpec>;
  defaultVersion: string;
  depth: number;
}) {
  const issues = useProjectStore((store) => store.issues);
  const suggested = suggestNavVersion(
    entry,
    baseline.get(entry.htmlID),
    defaultVersion,
  );
  const baselineEntry = baseline.get(entry.htmlID);

  function patch(next: Partial<NavEntrySpec>) {
    const merged = { ...entry, ...next };
    const nextVersion = suggestNavVersion(
      merged,
      baseline.get(merged.htmlID),
      defaultVersion,
    );
    onChange({ ...merged, version: nextVersion || defaultVersion });
  }

  return (
    <div className="nav-entry" style={{ marginLeft: depth * 16 }}>
      <IssueBadge issues={issues} type="navigation" id={entry.htmlID} />
      <div className="row-fields">
        <TextField label="htmlID" value={entry.htmlID} onChange={(value) => patch({ htmlID: value })} />
        <LocalizedTextInput label="条目标题" value={entry.title} onChange={(value) => patch({ title: value })} />
        <TextField label="排序" type="number" value={entry.sortOrder} onChange={(value) => patch({ sortOrder: Number(value) || 0 })} />
        <TextField label="版本" value={entry.version} onChange={(value) => onChange({ ...entry, version: value })} />
        <TextField label="pageId" value={entry.pageId} onChange={(value) => patch({ pageId: value })} />
        <TextField label="pageURL" value={entry.pageURL ?? ''} onChange={(value) => patch({ pageURL: value })} />
        <TextField label="schoolIds" value={(entry.schoolIds ?? []).join(',')} onChange={(value) => patch({ schoolIds: value.split(',').map((part) => Number(part.trim())).filter((part) => Number.isFinite(part) && part > 0) })} />
        <SelectField
          label="上下文类型"
          value={entry.contextType}
          allowEmpty
          options={[
            { value: 'main', label: 'main' },
            { value: 'student', label: 'student' },
            { value: 'staff', label: 'staff' },
          ]}
          onChange={(value) => patch({ contextType: value ? (value as NavContextType) : undefined })}
        />
        <SelectField
          label="必需上下文"
          value={entry.requiredContext}
          allowEmpty
          options={[
            { value: 'student', label: 'student' },
            { value: 'staff', label: 'staff' },
          ]}
          onChange={(value) => patch({ requiredContext: value ? (value as 'student' | 'staff') : undefined })}
        />
        <SelectField
          label="学区层级"
          value={entry.districtLevelContext === undefined ? undefined : String(entry.districtLevelContext) as '0' | '1' | '2'}
          allowEmpty
          options={[
            { value: '0', label: '0' },
            { value: '1', label: '1' },
            { value: '2', label: '2' },
          ]}
          onChange={(value) => patch({ districtLevelContext: value ? (Number(value) as 0 | 1 | 2) : undefined })}
        />
        <TextField label="父 htmlID" value={entry.parentHTMLID} onChange={(value) => patch({ parentHTMLID: value })} />
        <CheckboxField label="新标签页" checked={entry.isNewTab ?? false} onChange={(value) => patch({ isNewTab: value })} />
        <CheckboxField label="落地页" checked={entry.isLandingPage ?? false} onChange={(value) => patch({ isLandingPage: value })} />
        <CheckboxField label="检查参数" checked={entry.checkParams ?? false} onChange={(value) => patch({ checkParams: value })} />
        <JsonTextarea label="extra" value={entry.extra} onChange={(value) => patch({ extra: value as Record<string, unknown> | undefined })} />
      </div>

      {baselineEntry && suggested !== entry.version ? (
        <p className="muted">内容已变化，版本建议 {suggested}。</p>
      ) : null}

      <NavEntryList
        entries={entry.children ?? []}
        onChange={(children) => onChange({ ...entry, children })}
        baseline={baseline}
        defaultVersion={defaultVersion}
        depth={depth + 1}
        addLabel="添加子条目"
      />
    </div>
  );
}

function NavEntryList({
  entries,
  onChange,
  baseline,
  defaultVersion,
  depth,
  addLabel,
}: {
  entries: NavEntrySpec[];
  onChange: (entries: NavEntrySpec[]) => void;
  baseline: Map<string, NavEntrySpec>;
  defaultVersion: string;
  depth: number;
  addLabel: string;
}) {
  return (
    <div className="nav-entry-list">
      {entries.map((entry, index) => (
        <div className="nav-entry-row" key={index}>
          <NavEntryEditor
            entry={entry}
            baseline={baseline}
            defaultVersion={defaultVersion}
            depth={depth}
            onChange={(next) =>
              onChange(entries.map((item, i) => (i === index ? next : item)))
            }
          />
          <button
            type="button"
            aria-label="删除条目"
            onClick={() => {
              const name = entry.title?.en ?? entry.htmlID;
              if (
                !window.confirm(
                  `确定删除导航条目 ${name}？其子条目也会一并删除，此操作不可撤销。`,
                )
              ) {
                return;
              }
              onChange(entries.filter((_, i) => i !== index));
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...entries, { ...newEntry(), version: defaultVersion }])
        }
      >
        {addLabel}
      </button>
    </div>
  );
}

export function NavigationPage() {
  const spec = useProjectStore((store) => store.spec);
  const issues = useProjectStore((store) => store.issues);
  const update = useProjectStore((store) => store.update);
  const navBaseline = useProjectStore((store) => store.navBaseline);
  const [selected, setSelected] = useState(0);
  if (!spec) return null;

  const files = spec.navigation;
  const index = Math.min(selected, Math.max(files.length - 1, 0));
  const file = files[index];
  const baseline = new Map(
    (navBaseline ?? []).map((entry) => [entry.htmlID, entry]),
  );

  function setFiles(next: NavFileSpec[]) {
    update('navigation', next);
  }

  return (
    <section className="split">
      <aside className="list-pane">
        <h2>导航文件</h2>
        <ul>
          {files.map((entry, i) => (
            <li key={i}>
              <button
                type="button"
                className={i === index ? 'active' : ''}
                onClick={() => setSelected(i)}
              >
                {entry.filename}
                <small>{entry.contextType} · {entry.entries.length} 条目</small>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setFiles([...files, newNavFile()]);
            setSelected(files.length);
          }}
        >
          添加导航文件
        </button>
      </aside>

      <div className="detail-pane">
        {!file ? (
          <p className="muted">还没有导航文件。</p>
        ) : (
          <div className="form-section">
            <SectionIssues
              issues={issues.filter(
                (issue) =>
                  issue.target?.type === 'navigation' &&
                  issue.target?.id !== undefined &&
                  file.entries.some(
                    (entry) => entry.htmlID === issue.target?.id,
                  ),
              )}
            />
            <TextField label="文件名" value={file.filename} onChange={(value) => setFiles(files.map((entry, i) => (i === index ? { ...entry, filename: value } : entry)))} />
            <SelectField
              label="文件上下文"
              value={file.contextType}
              options={[
                { value: 'main', label: 'main' },
                { value: 'student', label: 'student' },
                { value: 'staff', label: 'staff' },
              ]}
              onChange={(value) => setFiles(files.map((entry, i) => (i === index ? { ...entry, contextType: value } : entry)))}
            />
            <NavEntryList
              entries={file.entries}
              onChange={(entries) => setFiles(files.map((entry, i) => (i === index ? { ...entry, entries } : entry)))}
              baseline={baseline}
              defaultVersion={spec.plugin.navVersion}
              depth={0}
              addLabel="添加条目"
            />
          </div>
        )}
      </div>
    </section>
  );
}
