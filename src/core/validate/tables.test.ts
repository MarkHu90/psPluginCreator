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
    tables: [],
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

function table(overrides: any = {}) {
  return {
    extensionName: 'U_Demo',
    schemaFile: 'U_Demo.xml',
    tableName: 'U_Demo',
    childName: 'U_Demo',
    comment: 'Demo',
    fields: [{ name: 'name', type: 'String', length: 100 }],
    ...overrides,
  };
}

describe('table and field rules', () => {
  it('rejects invalid table identifiers', () => {
    const spec = baseSpec();
    spec.tables = [table({ tableName: 'U-Demo' })];

    expect(codes(validateSpec(spec))).toContain('TABLE_IDENTIFIER_INVALID');
  });

  it('requires a length for String fields', () => {
    const spec = baseSpec();
    spec.tables = [table({ fields: [{ name: 'name', type: 'String' }] })];

    expect(codes(validateSpec(spec))).toContain('TABLE_STRING_LENGTH_REQUIRED');
  });

  it('rejects String lengths outside 1..4000', () => {
    const spec = baseSpec();
    spec.tables = [
      table({ fields: [{ name: 'name', type: 'String', length: 4001 }] }),
    ];

    expect(codes(validateSpec(spec))).toContain('TABLE_STRING_LENGTH_INVALID');
  });

  it('rejects duplicate table names', () => {
    const spec = baseSpec();
    spec.tables = [
      table(),
      table({ extensionName: 'U_Demo2', schemaFile: 'U_Demo2.xml' }),
    ];

    expect(codes(validateSpec(spec))).toContain('TABLE_DUPLICATE_TABLE');
  });

  it('rejects duplicate field names within a table', () => {
    const spec = baseSpec();
    spec.tables = [
      table({
        fields: [
          { name: 'name', type: 'String', length: 100 },
          { name: 'name', type: 'Integer' },
        ],
      }),
    ];

    expect(codes(validateSpec(spec))).toContain('TABLE_DUPLICATE_FIELD');
  });

  it('warns when a table name is longer than the legacy 30-char limit', () => {
    const spec = baseSpec();
    spec.tables = [table({ tableName: `U_${'A'.repeat(30)}` })];

    const issues = validateSpec(spec);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'TABLE_NAME_LONG',
        }),
      ]),
    );
  });

  it('rejects the same schemaFile used by different extension groups', () => {
    const spec = baseSpec();
    spec.tables = [
      table(),
      table({
        extensionName: 'U_Other',
        schemaFile: 'U_Demo.xml',
        tableName: 'U_Other',
      }),
    ];

    expect(codes(validateSpec(spec))).toContain('TABLE_SCHEMA_FILE_DUPLICATE');
  });
});
