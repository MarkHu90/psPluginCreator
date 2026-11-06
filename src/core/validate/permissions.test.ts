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
        title: { en: 'List' },
        table: 'U_Demo',
        columns: [{ column: 'name', label: { en: 'Name' } }],
        apiResources: ['/ws/schema/query/com.acme.demo.list'],
      },
    ],
    navigation: [],
    powerQueries: [
      {
        filename: 'com.acme.demo.named_queries.xml',
        queries: [
          {
            name: 'com.acme.demo.list',
            columns: [{ column: 'U_DEMO.NAME', alias: 'U_DEMO.NAME' }],
            sql: 'select name from u_demo order by name',
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
            resources: [
              { path: '/ws/schema/query/com.acme.demo.list', allow: 'post' },
            ],
          },
        ],
      },
    ],
    wildcards: [],
    messageKeys: [],
    rawFiles: [],
  };
}

function codes(issues: any[]) {
  return issues.map((i) => i.code);
}

describe('permission mappings', () => {
  it('accepts a page whose apiResources are mapped with the right method', () => {
    const issues = validateSpec(baseSpec());
    expect(codes(issues).filter((c) => c.startsWith('PERMISSION_'))).toEqual([]);
  });

  it('rejects a page resource with no permission mapping', () => {
    const spec = baseSpec();
    spec.permissionMappings = [];

    expect(codes(validateSpec(spec))).toContain('PERMISSION_MAPPING_MISSING');
  });

  it('requires allow=post for PowerQuery resources', () => {
    const spec = baseSpec();
    spec.permissionMappings[0].mappings[0].resources[0].allow = 'get';

    expect(codes(validateSpec(spec))).toContain('PERMISSION_METHOD_MISSING');
  });

  it('rejects an invalid resource path', () => {
    const spec = baseSpec();
    spec.permissionMappings[0].mappings[0].resources[0].path = 'not-a-ws-path';

    expect(codes(validateSpec(spec))).toContain('PERMISSION_RESOURCE_INVALID');
  });

  it('warns when a mapping points at an unknown page', () => {
    const spec = baseSpec();
    spec.permissionMappings[0].mappings[0].page = '/admin/demo/missing.html';

    const issues = validateSpec(spec);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'PERMISSION_PAGE_UNKNOWN',
        }),
      ]),
    );
  });

  it('rejects duplicate permission mapping filenames', () => {
    const spec = baseSpec();
    spec.permissionMappings.push({ ...spec.permissionMappings[0] });

    expect(codes(validateSpec(spec))).toContain('PERMISSION_FILE_DUPLICATE');
  });
});
