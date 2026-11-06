import { useState } from 'react';
import type {
  FilterSpec,
  FormFieldSpec,
  JoinSpec,
  ListColumnSpec,
  PageSpec,
} from '../../core/index';
import { IssueBadge } from '../components/IssueBadge';
import { JsonTextarea } from '../components/JsonTextarea';
import { LocalizedTextInput } from '../components/LocalizedTextInput';
import { RowEditor } from '../components/RowEditor';
import { SectionIssues } from '../components/SectionIssues';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { CheckboxField } from '../components/CheckboxField';
import { useProjectStore } from '../store/projectStore';

const CONTEXT_ROOT: Record<string, string> = {
  admin: 'admin/',
  adminStudent: 'admin/',
  teacher: 'teachers/',
  teacherStudent: 'teachers/',
  guardian: 'guardian/',
  student: 'guardian/',
};

function newPage(): PageSpec {
  return {
    id: 'page-1',
    kind: 'list',
    context: 'admin',
    path: 'admin/demo/page-1.html',
    title: { en: 'New Page' },
    table: undefined,
    columns: [],
  };
}

function newColumn(): ListColumnSpec {
  return { column: '', label: { en: '' }, type: 'string', sortable: true };
}

function newFormField(): FormFieldSpec {
  return { column: '', label: { en: '' }, widget: 'text' };
}

function newFilter(): FilterSpec {
  return {
    param: 'filter',
    column: '',
    operator: '=',
    widget: 'text',
    label: { en: '' },
  };
}

function newJoin(): JoinSpec {
  return { table: '', on: '', type: 'left' };
}

export function PagesPage() {
  const spec = useProjectStore((store) => store.spec);
  const issues = useProjectStore((store) => store.issues);
  const update = useProjectStore((store) => store.update);
  const [selected, setSelected] = useState(0);
  if (!spec) return null;

  const pages = spec.pages;
  const index = Math.min(selected, Math.max(pages.length - 1, 0));
  const page = pages[index];

  function setPages(next: PageSpec[]) {
    update('pages', next);
  }

  function patchPage(patch: Partial<PageSpec>) {
    setPages(pages.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  const prefix = CONTEXT_ROOT[page?.context ?? 'admin'] ?? 'admin/';

  return (
    <section className="split">
      <aside className="list-pane">
        <h2>页面</h2>
        <ul>
          {pages.map((entry, i) => (
            <li key={i}>
              <button
                type="button"
                className={i === index ? 'active' : ''}
                onClick={() => setSelected(i)}
              >
                {entry.title.en || entry.id}{' '}
                <IssueBadge issues={issues} type="page" id={entry.id} />
                <small>{entry.kind} · {entry.context}</small>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            const next = [...pages, newPage()];
            setPages(next);
            setSelected(next.length - 1);
          }}
        >
          添加页面
        </button>
      </aside>

      <div className="detail-pane">
        {!page ? (
          <p className="muted">还没有页面。点击「添加页面」。</p>
        ) : (
          <div className="form-section">
            <SectionIssues
              issues={issues.filter(
                (issue) =>
                  issue.target?.type === 'page' &&
                  issue.target?.id === page.id,
              )}
            />
            <div className="section-header">
              <h2>页面详情</h2>
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      `确定删除页面 ${page.id}？此操作不可撤销。`,
                    )
                  ) {
                    return;
                  }
                  setPages(pages.filter((_, i) => i !== index));
                  setSelected(0);
                }}
              >
                删除页面
              </button>
            </div>

            <TextField label="ID" value={page.id} onChange={(value) => patchPage({ id: value })} />
            <SelectField
              label="类型"
              value={page.kind}
              options={[
                { value: 'list', label: 'list' },
                { value: 'edit', label: 'edit' },
                { value: 'settings', label: 'settings' },
                { value: 'dashboard', label: 'dashboard' },
                { value: 'custom', label: 'custom' },
                { value: 'raw', label: 'raw' },
              ]}
              onChange={(value) => patchPage({ kind: value })}
            />
            <SelectField
              label="上下文"
              value={page.context}
              options={[
                { value: 'admin', label: 'admin' },
                { value: 'adminStudent', label: 'adminStudent' },
                { value: 'teacher', label: 'teacher' },
                { value: 'teacherStudent', label: 'teacherStudent' },
                { value: 'guardian', label: 'guardian' },
                { value: 'student', label: 'student' },
              ]}
              onChange={(value) => patchPage({ context: value })}
            />
            <p className="muted">路径应位于 {prefix}；保存前请自行确认。</p>
            <TextField label="路径" value={page.path} onChange={(value) => patchPage({ path: value })} />
            <LocalizedTextInput label="标题" value={page.title} onChange={(value) => patchPage({ title: value })} />
            <SelectField
              label="表"
              value={page.table}
              options={spec.tables.map((table) => ({
                value: table.tableName,
                label: table.tableName,
              }))}
              allowEmpty
              onChange={(value) => patchPage({ table: value ? value : undefined })}
            />
            <SelectField
              label="学生范围"
              value={page.studentScope}
              options={[
                { value: 'curstudid', label: 'curstudid' },
                { value: 'gpv.studentid', label: 'gpv.studentid' },
                { value: 'none', label: 'none' },
              ]}
              allowEmpty
              onChange={(value) =>
                patchPage({
                  studentScope: value ? (value as PageSpec['studentScope']) : undefined,
                })
              }
            />
            <TextField label="记录 ID 参数" value={page.recordIdParam} onChange={(value) => patchPage({ recordIdParam: value })} />
            <JsonTextarea label="API 资源" value={page.apiResources} onChange={(value) => patchPage({ apiResources: value as string[] | undefined })} />

            {page.kind === 'list' ? (
              <>
                <h3>列</h3>
                <RowEditor rows={page.columns ?? []} onChange={(columns) => patchPage({ columns })} createRow={newColumn} addLabel="添加列">
                  {(column, patch) => (
                    <>
                      <TextField label="列名" value={column.column} onChange={(value) => patch({ column: value })} />
                      <LocalizedTextInput label="列标签" value={column.label} onChange={(value) => patch({ label: value })} />
                      <SelectField
                        label="列类型"
                        value={column.type}
                        options={[
                          { value: 'string', label: 'string' },
                          { value: 'number', label: 'number' },
                          { value: 'date', label: 'date' },
                          { value: 'datetime', label: 'datetime' },
                        ]}
                        allowEmpty
                        onChange={(value) =>
                          patch({ type: value ? (value as ListColumnSpec['type']) : undefined })
                        }
                      />
                      <TextField label="宽度" value={column.width} onChange={(value) => patch({ width: value })} />
                      <CheckboxField label="可排序" checked={column.sortable ?? false} onChange={(value) => patch({ sortable: value })} />
                    </>
                  )}
                </RowEditor>

                <h3>筛选器</h3>
                <RowEditor rows={page.filters ?? []} onChange={(filters) => patchPage({ filters })} createRow={newFilter} addLabel="添加筛选器">
                  {(filter, patch) => (
                    <>
                      <TextField label="参数" value={filter.param} onChange={(value) => patch({ param: value })} />
                      <TextField label="列" value={filter.column} onChange={(value) => patch({ column: value })} />
                      <SelectField
                        label="操作符"
                        value={filter.operator}
                        options={[
                          { value: '=', label: '=' },
                          { value: '>=', label: '>=' },
                          { value: '<=', label: '<=' },
                          { value: '>', label: '>' },
                        ]}
                        onChange={(value) => patch({ operator: value })}
                      />
                      <SelectField
                        label="控件"
                        value={filter.widget}
                        options={[
                          { value: 'select', label: 'select' },
                          { value: 'text', label: 'text' },
                          { value: 'date', label: 'date' },
                        ]}
                        onChange={(value) => patch({ widget: value })}
                      />
                      <LocalizedTextInput label="筛选标签" value={filter.label} onChange={(value) => patch({ label: value })} />
                      <TextField label="选项 SQL" value={filter.optionsSql} onChange={(value) => patch({ optionsSql: value })} />
                      <CheckboxField label="客户端筛选" checked={filter.clientSide ?? false} onChange={(value) => patch({ clientSide: value })} />
                      <JsonTextarea label="选项" value={filter.options} onChange={(value) => patch({ options: value as FilterSpec['options'] })} />
                    </>
                  )}
                </RowEditor>

                <h3>关联</h3>
                <RowEditor rows={page.joins ?? []} onChange={(joins) => patchPage({ joins })} createRow={newJoin} addLabel="添加关联">
                  {(join, patch) => (
                    <>
                      <TextField label="关联表" value={join.table} onChange={(value) => patch({ table: value })} />
                      <TextField label="关联条件" value={join.on} onChange={(value) => patch({ on: value })} />
                      <SelectField
                        label="关联类型"
                        value={join.type}
                        options={[
                          { value: 'left', label: 'left' },
                          { value: 'inner', label: 'inner' },
                        ]}
                        allowEmpty
                        onChange={(value) =>
                          patch({ type: value ? (value as JoinSpec['type']) : undefined })
                        }
                      />
                    </>
                  )}
                </RowEditor>

                <TextField label="排序" value={page.orderBy} onChange={(value) => patchPage({ orderBy: value })} />
                <CheckboxField label="CSV 导出" checked={page.csvExport ?? false} onChange={(value) => patchPage({ csvExport: value })} />
              </>
            ) : null}

            {page.kind === 'edit' || page.kind === 'settings' ? (
              <>
                <h3>表单字段</h3>
                <RowEditor rows={page.fields ?? []} onChange={(fields) => patchPage({ fields })} createRow={newFormField} addLabel="添加字段">
                  {(field, patch) => (
                    <>
                      <TextField label="字段名" value={field.column} onChange={(value) => patch({ column: value })} />
                      <LocalizedTextInput label="字段标签" value={field.label} onChange={(value) => patch({ label: value })} />
                      <SelectField
                        label="控件"
                        value={field.widget}
                        options={[
                          { value: 'text', label: 'text' },
                          { value: 'textarea', label: 'textarea' },
                          { value: 'integer', label: 'integer' },
                          { value: 'decimal', label: 'decimal' },
                          { value: 'date', label: 'date' },
                          { value: 'checkbox', label: 'checkbox' },
                          { value: 'select', label: 'select' },
                          { value: 'hidden', label: 'hidden' },
                          { value: 'readonly', label: 'readonly' },
                        ]}
                        onChange={(value) => patch({ widget: value })}
                      />
                      <CheckboxField label="必填" checked={field.required ?? false} onChange={(value) => patch({ required: value })} />
                      <CheckboxField label="只读" checked={field.readonly ?? false} onChange={(value) => patch({ readonly: value })} />
                      <CheckboxField label="隐藏" checked={field.hidden ?? false} onChange={(value) => patch({ hidden: value })} />
                      <TextField label="最大长度" type="number" value={field.maxLength} onChange={(value) => patch({ maxLength: value ? Number(value) : undefined })} />
                      <TextField label="默认值" value={field.defaultValue} onChange={(value) => patch({ defaultValue: value })} />
                      <JsonTextarea label="选项" value={field.options} onChange={(value) => patch({ options: value as FormFieldSpec['options'] })} />
                      <JsonTextarea label="SQL 选项" value={field.sqlOptions} onChange={(value) => patch({ sqlOptions: value as FormFieldSpec['sqlOptions'] })} />
                    </>
                  )}
                </RowEditor>
              </>
            ) : null}

            {page.kind === 'dashboard' || page.kind === 'custom' ? (
              <label className="field">
                <span>自定义正文</span>
                <textarea
                  aria-label="自定义正文"
                  rows={10}
                  value={page.customBody ?? ''}
                  onChange={(event) => patchPage({ customBody: event.target.value })}
                />
              </label>
            ) : null}

            {page.kind === 'raw' ? (
              <p className="muted">raw 页面内容来自 Raw 文件页中相同路径的文件。</p>
            ) : null}

            <h3>页头 / 页脚覆盖</h3>
            <TextField label="页头" value={page.chrome?.header} onChange={(value) => patchPage({ chrome: { ...page.chrome, header: value } })} />
            <TextField label="页脚" value={page.chrome?.footer} onChange={(value) => patchPage({ chrome: { ...page.chrome, footer: value } })} />
          </div>
        )}
      </div>
    </section>
  );
}
