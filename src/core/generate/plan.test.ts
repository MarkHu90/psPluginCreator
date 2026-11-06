import { describe, expect, it } from 'vitest';
import { makeSpec } from '../test-helpers';
import { generatePlan } from './plan';

function spec() {
  return makeSpec({
    tables: [
      {
        extensionName: 'U_Demo',
        schemaFile: 'U_Demo.xml',
        tableName: 'U_Demo',
        childName: 'U_Demo',
        comment: 'Demo',
        fields: [{ name: 'name', type: 'String', length: 100 }],
      },
    ],
    pages: [
      {
        id: 'list',
        kind: 'list',
        context: 'admin',
        path: 'admin/demo/list.html',
        title: { en: 'Demo' },
        table: 'U_Demo',
        columns: [{ column: 'name', label: { en: 'Name' } }],
      },
    ],
    navigation: [
      {
        filename: 'demo_schoolNav.json',
        contextType: 'main',
        entries: [
          {
            htmlID: 'navDemo',
            title: { en: 'Demo' },
            sortOrder: 100,
            version: '1.0.0.0',
            pageId: 'list',
          },
        ],
      },
    ],
    powerQueries: [
      {
        filename: 'com.acme.demo.named_queries.xml',
        queries: [
          {
            name: 'com.acme.demo.list',
            columns: [{ column: 'U_DEMO.NAME', alias: 'U_DEMO.NAME' }],
            sql: 'select name from u_demo',
          },
        ],
      },
    ],
    accessRequest: [{ table: 'U_DEMO', field: 'NAME', access: 'ViewOnly' }],
    permissionMappings: [
      {
        filename: 'demo.permission_mappings.xml',
        mappings: [
          {
            page: '/admin/demo/list.html',
            resources: [{ path: '/ws/schema/query/com.acme.demo.list', allow: 'post' }],
          },
        ],
      },
    ],
    messageKeys: [
      { locale: 'US_en', filename: 'demo.US_en.properties', entries: [] },
    ],
    wildcards: [
      { filename: 'admin_leftnav.demo.txt', kind: 'raw', content: '<li>Demo</li>' },
    ],
    rawFiles: [{ path: 'api/web_root/images/logo.png' }],
  });
}

describe('generatePlan', () => {
  it('lays out API, DB, and web files under the package roots', () => {
    const files = generatePlan(spec(), {
      rawFiles: new Map([['api/web_root/images/logo.png', new Uint8Array([1, 2, 3])]]),
    });
    const paths = files.map((file) => file.path);

    expect(paths).toContain('api/plugin.xml');
    expect(paths).toContain('dbsetup/plugin.xml');
    expect(paths).toContain('dbsetup/user_schema_root/U_Demo.xml');
    expect(paths).toContain('api/pagecataloging/demo_schoolNav.json');
    expect(paths).toContain('api/queries_root/com.acme.demo.named_queries.xml');
    expect(paths).toContain('api/permissions_root/demo.permission_mappings.xml');
    expect(paths).toContain('api/MessageKeys/demo.US_en.properties');
    expect(paths).toContain('api/web_root/admin/demo/list.html');
    expect(paths).toContain('api/web_root/admin/demo/list.json');
    expect(paths).toContain('api/web_root/scripts/demo/list.js');
    expect(paths).toContain('api/web_root/wildcards/admin_leftnav.demo.txt');
    expect(paths).toContain('api/web_root/images/logo.png');
  });

  it('marks raw files and preserves their bytes', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const files = generatePlan(spec(), {
      rawFiles: new Map([['api/web_root/images/logo.png', bytes]]),
    });
    const raw = files.find((file) => file.path === 'api/web_root/images/logo.png');

    expect(raw?.source).toBe('raw');
    expect(raw?.content).toBe(bytes);
  });

  it('returns a deterministic path order', () => {
    const files = generatePlan(spec(), {
      rawFiles: new Map([['api/web_root/images/logo.png', 'x']]),
    });
    const paths = files.map((file) => file.path);
    expect(paths).toEqual([...paths].sort());
  });
});
