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

describe('plugin metadata', () => {
  it('rejects an invalid workspace key', () => {
    const spec = baseSpec();
    spec.key = 'Demo Key';

    expect(codes(validateSpec(spec))).toContain('KEY_INVALID');
  });

  it('requires a plugin name', () => {
    const spec = baseSpec();
    delete spec.plugin.name;

    expect(codes(validateSpec(spec))).toContain('PLUGIN_NAME_REQUIRED');
  });

  it('rejects a plugin name longer than 40 characters', () => {
    const spec = baseSpec();
    spec.plugin.name = 'A'.repeat(41);

    expect(codes(validateSpec(spec))).toContain('PLUGIN_NAME_TOO_LONG');
  });

  it('requires publisher name and email', () => {
    const spec = baseSpec();
    spec.plugin.publisher = { name: '' };

    expect(codes(validateSpec(spec))).toContain('PUBLISHER_INVALID');
  });
});

describe('message keys', () => {
  it('rejects duplicate message key filenames', () => {
    const spec = baseSpec();
    spec.messageKeys = [
      { filename: 'demo.US_en.properties', entries: [] },
      { filename: 'demo.US_en.properties', entries: [] },
    ];

    expect(codes(validateSpec(spec))).toContain('MESSAGE_KEY_DUPLICATE_FILE');
  });

  it('rejects duplicate keys inside a file', () => {
    const spec = baseSpec();
    spec.messageKeys = [
      {
        filename: 'demo.US_en.properties',
        entries: [
          { key: 'demo.title', value: 'One' },
          { key: 'demo.title', value: 'Two' },
        ],
      },
    ];

    expect(codes(validateSpec(spec))).toContain('MESSAGE_KEY_DUPLICATE_KEY');
  });
});

describe('raw files and wildcards', () => {
  it('rejects unsafe raw paths', () => {
    const spec = baseSpec();
    spec.rawFiles = [{ path: '../secret.txt' }];

    expect(codes(validateSpec(spec))).toContain('RAW_PATH_UNSAFE');
  });

  it('rejects duplicate raw paths', () => {
    const spec = baseSpec();
    spec.rawFiles = [{ path: 'web_root/scripts/a.js' }, { path: 'web_root/scripts/a.js' }];

    expect(codes(validateSpec(spec))).toContain('RAW_PATH_DUPLICATE');
  });

  it('rejects raw files that collide with generated files', () => {
    const spec = baseSpec();
    spec.pages = [
      {
        id: 'page1',
        kind: 'custom',
        context: 'admin',
        path: 'admin/page1.html',
        title: { en: 'Page 1' },
      },
    ];
    spec.rawFiles = [{ path: 'admin/page1.html' }];

    expect(codes(validateSpec(spec))).toContain('RAW_PATH_CONFLICT');
  });

  it('detects a raw collision when the raw path uses the api/web_root prefix', () => {
    const spec = baseSpec();
    spec.pages = [
      {
        id: 'page1',
        kind: 'custom',
        context: 'admin',
        path: 'admin/page1.html',
        title: { en: 'Page 1' },
      },
    ];
    spec.rawFiles = [{ path: 'api/web_root/admin/page1.html' }];

    expect(codes(validateSpec(spec))).toContain('RAW_PATH_CONFLICT');
  });

  it('requires a raw page to reference an existing raw file', () => {
    const spec = baseSpec();
    spec.pages = [
      {
        id: 'raw1',
        kind: 'raw',
        context: 'admin',
        path: 'admin/raw1.html',
        title: { en: 'Raw' },
      },
    ];

    expect(codes(validateSpec(spec))).toContain('RAW_PAGE_MISSING_FILE');
  });

  it('rejects an unsafe wildcard filename', () => {
    const spec = baseSpec();
    spec.wildcards = [{ filename: '../evil.txt', kind: 'raw', content: '' }];

    expect(codes(validateSpec(spec))).toContain('WILDCARD_FILENAME_INVALID');
  });
});
