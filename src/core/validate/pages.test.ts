import { describe, expect, it } from 'vitest';
import { validateSpec } from './index';

function baseSpec(): any {
  return {
    schemaVersion: 1,
    key: 'demo',
    plugin: {
      name: 'Demo Plugin',
      description: 'Demo',
      version: '1.0.0',
      dbName: 'Demo Plugin DB',
      dbDescription: 'Demo DB',
      dbVersion: '1.0.0',
      navVersion: '1.0.0.0',
      publisher: { name: 'Example Publisher', email: 'publisher@example.com' },
    },
    tables: [
      {
        extensionName: 'U_Demo',
        tableName: 'U_Demo',
        childName: 'U_Demo',
        comment: 'Demo table',
        fields: [
          { name: 'name', type: 'String', length: 100 },
          { name: 'score', type: 'Integer' },
        ],
      },
    ],
    pages: [],
    navigation: [],
    powerQueries: [],
    wildcards: [],
    messageKeys: [],
    rawFiles: [],
    accessRequest: [],
  };
}

function codes(issues: any[]) {
  return issues.map((i) => i.code);
}

function listPage(overrides: any = {}) {
  return {
    id: 'list',
    kind: 'list',
    context: 'admin',
    path: 'admin/demo/list.html',
    title: { en: 'List' },
    table: 'U_Demo',
    columns: [{ column: 'name', label: { en: 'Name' } }],
    ...overrides,
  };
}

function editPage(overrides: any = {}) {
  return {
    id: 'edit',
    kind: 'edit',
    context: 'admin',
    path: 'admin/demo/edit.html',
    title: { en: 'Edit' },
    table: 'U_Demo',
    fields: [{ column: 'name', label: { en: 'Name' }, widget: 'text' }],
    ...overrides,
  };
}

describe('page structure', () => {
  it('rejects duplicate page ids', () => {
    const spec = baseSpec();
    spec.pages = [listPage(), listPage({ id: 'list', path: 'admin/demo/list2.html' })];

    expect(codes(validateSpec(spec))).toContain('PAGE_DUPLICATE_ID');
  });

  it('rejects duplicate page paths', () => {
    const spec = baseSpec();
    spec.pages = [listPage(), listPage({ id: 'list2' })];

    expect(codes(validateSpec(spec))).toContain('PAGE_DUPLICATE_PATH');
  });

  it('rejects a list page without columns', () => {
    const spec = baseSpec();
    spec.pages = [listPage({ columns: [] })];

    expect(codes(validateSpec(spec))).toContain('PAGE_LIST_NO_COLUMNS');
  });

  it('rejects an edit page without fields', () => {
    const spec = baseSpec();
    spec.pages = [editPage({ fields: [] })];

    expect(codes(validateSpec(spec))).toContain('PAGE_EDIT_NO_FIELDS');
  });

  it('rejects a page bound to an unknown table', () => {
    const spec = baseSpec();
    spec.pages = [editPage({ table: 'U_Missing' })];

    expect(codes(validateSpec(spec))).toContain('PAGE_TABLE_UNKNOWN');
  });

  it('warns when a CRUD page binds a core table not defined in spec.tables', () => {
    const spec = baseSpec();
    spec.pages = [editPage({ table: 'STUDENTS' })];

    const issues = validateSpec(spec);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'PAGE_TABLE_CORE_UNSUPPORTED',
        }),
      ]),
    );
  });

  it('rejects a form field that is not a column of the bound table', () => {
    const spec = baseSpec();
    spec.pages = [
      editPage({
        fields: [{ column: 'missing', label: { en: 'Missing' }, widget: 'text' }],
      }),
    ];

    expect(codes(validateSpec(spec))).toContain('PAGE_FIELD_UNKNOWN');
  });

  it('rejects unsafe page paths', () => {
    const spec = baseSpec();
    spec.pages = [listPage({ path: 'admin/../secret.html' })];

    expect(codes(validateSpec(spec))).toContain('PAGE_PATH_UNSAFE');
  });

  it('rejects an unsupported page context', () => {
    const spec = baseSpec();
    spec.pages = [listPage({ context: 'parent' })];

    expect(codes(validateSpec(spec))).toContain('PAGE_CONTEXT_INVALID');
  });

  it('rejects an unsupported page kind', () => {
    const spec = baseSpec();
    spec.pages = [listPage({ kind: 'weird' })];

    expect(codes(validateSpec(spec))).toContain('PAGE_KIND_INVALID');
  });
});
