import { useState } from 'react';
import type { FieldSpec, TableSpec } from '../../core/index';
import { IssueBadge } from '../components/IssueBadge';
import { RowEditor } from '../components/RowEditor';
import { SectionIssues } from '../components/SectionIssues';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useProjectStore } from '../store/projectStore';

function newTable(): TableSpec {
  return {
    extensionName: 'U_New',
    schemaFile: 'U_New.xml',
    tableName: 'U_New_Table',
    childName: 'U_New_Table',
    comment: '',
    type: 'standalone',
    primaryKey: 'id',
    fields: [],
  };
}

function newField(): FieldSpec {
  return { name: 'new_field', type: 'String', length: 100, comment: '' };
}

export function TablesPage() {
  const spec = useProjectStore((store) => store.spec);
  const issues = useProjectStore((store) => store.issues);
  const update = useProjectStore((store) => store.update);
  const [selected, setSelected] = useState(0);
  if (!spec) return null;

  const tables = spec.tables;
  const index = Math.min(selected, Math.max(tables.length - 1, 0));
  const table = tables[index];

  function setTables(next: TableSpec[]) {
    update('tables', next);
  }

  function patchTable(patch: Partial<TableSpec>) {
    setTables(tables.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  return (
    <section className="split">
      <aside className="list-pane">
        <h2>表</h2>
        <ul>
          {tables.map((entry, i) => (
            <li key={i}>
              <button
                type="button"
                className={i === index ? 'active' : ''}
                onClick={() => setSelected(i)}
              >
                {entry.tableName}{' '}
                <IssueBadge issues={issues} type="table" id={entry.tableName} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setTables([...tables, newTable()]);
            setSelected(tables.length);
          }}
        >
          添加表
        </button>
      </aside>

      <div className="detail-pane">
        {!table ? (
          <p className="muted">还没有表。点击「添加表」。</p>
        ) : (
          <div className="form-section">
            <SectionIssues
              issues={issues.filter(
                (issue) =>
                  issue.target?.type === 'table' &&
                  issue.target?.id === table.tableName,
              )}
            />
            <div className="section-header">
              <h2>表详情</h2>
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      `确定删除表 ${table.tableName}？此操作不可撤销。`,
                    )
                  ) {
                    return;
                  }
                  setTables(tables.filter((_, i) => i !== index));
                  setSelected(0);
                }}
              >
                删除表
              </button>
            </div>
            <TextField label="Extension" value={table.extensionName} onChange={(value) => patchTable({ extensionName: value })} />
            <TextField label="Schema 文件" value={table.schemaFile} onChange={(value) => patchTable({ schemaFile: value })} />
            <TextField label="表名" value={table.tableName} onChange={(value) => patchTable({ tableName: value, childName: value })} />
            <TextField label="Child 名称" value={table.childName} onChange={(value) => patchTable({ childName: value })} />
            <TextField label="注释" value={table.comment} onChange={(value) => patchTable({ comment: value })} />
            <SelectField
              label="类型"
              value={table.type}
              options={[
                { value: 'standalone', label: 'standalone' },
                { value: 'oneToOne', label: 'oneToOne' },
                { value: 'oneToMany', label: 'oneToMany' },
              ]}
              allowEmpty
              onChange={(value) =>
                patchTable({
                  type: value ? (value as TableSpec['type']) : undefined,
                })
              }
            />
            <TextField label="主键" value={table.primaryKey} onChange={(value) => patchTable({ primaryKey: value })} />

            <h3>字段</h3>
            <RowEditor
              rows={table.fields}
              onChange={(fields) => patchTable({ fields })}
              createRow={newField}
              addLabel="添加字段"
            >
              {(field, patch) => (
                <>
                  <TextField label="字段名" value={field.name} onChange={(value) => patch({ name: value })} />
                  <SelectField
                    label="字段类型"
                    value={field.type}
                    options={[
                      { value: 'Integer', label: 'Integer' },
                      { value: 'String', label: 'String' },
                      { value: 'Date', label: 'Date' },
                      { value: 'DateTime', label: 'DateTime' },
                      { value: 'Decimal', label: 'Decimal' },
                    ]}
                    onChange={(value) => patch({ type: value })}
                  />
                  <TextField
                    label="长度"
                    type="number"
                    value={field.length}
                    onChange={(value) => patch({ length: value ? Number(value) : undefined })}
                  />
                  <TextField label="注释" value={field.comment} onChange={(value) => patch({ comment: value })} />
                </>
              )}
            </RowEditor>
          </div>
        )}
      </div>
    </section>
  );
}
