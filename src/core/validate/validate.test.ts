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

describe('page context paths', () => {
  it('rejects student-context pages placed under students/', () => {
    const spec = baseSpec();
    spec.pages.push({
      id: 'student-page',
      kind: 'custom',
      context: 'student',
      path: 'students/foo.html',
      title: { en: 'Foo' },
    });

    const issues = validateSpec(spec);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN',
        }),
      ]),
    );
  });

  it('accepts student-context pages under guardian/', () => {
    const spec = baseSpec();
    spec.pages.push({
      id: 'student-page',
      kind: 'custom',
      context: 'student',
      path: 'guardian/foo.html',
      title: { en: 'Foo' },
    });

    const issues = validateSpec(spec);

    expect(issues.filter((i: any) => i.code.startsWith('PAGE_'))).toEqual([]);
  });
});
