import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generatePages } from './pages';

function baseSpec() {
  return makeSpec({
    tables: [
      {
        extensionName: 'U_Demo',
        schemaFile: 'U_Demo.xml',
        tableName: 'U_Demo',
        childName: 'U_Demo',
        comment: 'Demo',
        primaryKey: 'id',
        fields: [
          { name: 'name', type: 'String', length: 100 },
          { name: 'score', type: 'Integer' },
          { name: 'studentsdcid', type: 'Integer' },
        ],
      },
    ],
    pages: [
      {
        id: 'list',
        kind: 'list',
        context: 'adminStudent',
        path: 'admin/students/demo/list.html',
        title: { en: 'Demo List', zh: '演示列表' },
        table: 'U_Demo',
        columns: [
          { column: 'name', label: { en: 'Name' } },
          { column: 'score', label: { en: 'Score' }, type: 'number' },
        ],
      },
      {
        id: 'edit',
        kind: 'edit',
        context: 'adminStudent',
        path: 'admin/students/demo/edit.html',
        title: { en: 'Demo Edit' },
        table: 'U_Demo',
        fields: [
          { column: 'name', label: { en: 'Name' }, widget: 'text', required: true },
          { column: 'score', label: { en: 'Score' }, widget: 'integer' },
        ],
      },
    ],
  });
}

function file(files: any[], path: string) {
  return files.find((f) => f.path === path);
}

describe('page generation', () => {
  it('generates a list page with context chrome, table and script', () => {
    const files = generatePages(baseSpec());
    const html = file(files, 'admin/students/demo/list.html')?.content ?? '';

    expect(html).toContain('~[wc:admin_header_frame_css]');
    expect(html).toContain('~[wc:admin_footer_frame_css]');
    expect(html).toContain('演示列表 Demo List');
    expect(html).toContain('Name');
    expect(html).toContain('Score');
    expect(html).toContain('/scripts/demo/list.js');
    expect(html).toContain('list.json');
  });

  it('adds an edit action for each row when an edit page exists', () => {
    const files = generatePages(baseSpec());
    const html = file(files, 'admin/students/demo/list.html')?.content ?? '';
    const js = file(files, 'scripts/demo/list.js')?.content ?? '';

    expect(html).toContain('>Action<');
    expect(js).toContain('Edit');
    expect(js).toContain('/admin/students/demo/edit.html');
  });

  it('uses a SQL subquery (not nested tlist_sql) for student scope', () => {
    const files = generatePages(baseSpec());
    const json = file(files, 'admin/students/demo/list.json')?.content ?? '';

    expect(json).toContain(
      'U_Demo.studentsdcid = (select dcid from students where id = ~(curstudid))',
    );
    expect(json).not.toContain('~[tlist_sql;select dcid');
  });

  it('generates a list JSON endpoint with tlist_sql and sentinel', () => {
    const files = generatePages(baseSpec());
    const json = file(files, 'admin/students/demo/list.json')?.content ?? '';

    expect(json).toContain('~[tlist_sql;');
    expect(json).toContain('from U_Demo');
    expect(json).toContain('"name":"~(c0;json)"');
    expect(json.trim().endsWith('{}]')).toBe(true);
  });

  it('generates an edit page with DirectTable and namespaced fields', () => {
    const files = generatePages(baseSpec());
    const html = file(files, 'admin/students/demo/edit.html')?.content ?? '';

    expect(html).toContain('~[DirectTable.Select:U_Demo;ID:~(gpv.id;num)]');
    expect(html).toContain('name="ac" value="prim"');
    expect(html).toContain('name="[U_Demo]name"');
    expect(html).toContain('name="[U_Demo]score"');
    expect(html).toContain('edit.json');
  });

  it('generates custom and dashboard pages', () => {
    const spec = makeSpec({
      pages: [
        {
          id: 'custom',
          kind: 'custom',
          context: 'admin',
          path: 'admin/demo/custom.html',
          title: { en: 'Custom' },
          customBody: '<p>Hello</p>',
        },
        {
          id: 'dash',
          kind: 'dashboard',
          context: 'admin',
          path: 'admin/demo/dashboard.html',
          title: { en: 'Dashboard' },
        },
      ],
    });

    const files = generatePages(spec);

    expect(file(files, 'admin/demo/custom.html')?.content).toContain('<p>Hello</p>');
    expect(file(files, 'admin/demo/dashboard.html')?.content).toContain(
      '/admin/demo/custom.html',
    );
  });

  it('uses the table primary key for the edit JSON lookup', () => {
    const spec = baseSpec();
    spec.tables[0].primaryKey = 'dcid';
    spec.pages[1].recordIdParam = 'uid';

    const files = generatePages(spec);
    const json = file(files, 'admin/students/demo/edit.json')?.content ?? '';

    expect(json).toContain('U_Demo.dcid = ~(gpv.uid;num)');
  });

  it('throws when a CRUD page binds a table that is not in spec.tables', () => {
    const spec = baseSpec();
    spec.pages[0].table = 'U_Missing';

    expect(() => generatePages(spec)).toThrow(/not in spec\.tables/);
  });

  it('does not generate a file for a raw page', () => {
    const spec = makeSpec({
      pages: [
        {
          id: 'raw',
          kind: 'raw',
          context: 'admin',
          path: 'admin/demo/raw.html',
          title: { en: 'Raw' },
        },
      ],
      rawFiles: [{ path: 'api/web_root/admin/demo/raw.html' }],
    });

    const files = generatePages(spec);
    expect(file(files, 'admin/demo/raw.html')).toBeUndefined();
  });
});
