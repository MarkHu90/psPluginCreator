import { describe, expect, it } from 'vitest';
import { buildServer } from './index';

const spec = {
  schemaVersion: 1,
  key: 'demo',
  plugin: {
    name: 'Demo',
    description: 'Demo',
    version: '1.0.0',
    dbName: 'Demo DB',
    dbDescription: 'Demo DB',
    dbVersion: '1.0.0',
    navVersion: '1.0.0.0',
    publisher: { name: 'P', email: 'p@example.com' },
  },
  tables: [],
  pages: [
    {
      id: 'p1',
      kind: 'custom',
      context: 'student',
      path: 'students/foo.html',
      title: { en: 'Foo' },
    },
  ],
  navigation: [],
  powerQueries: [],
  accessRequest: [],
  permissionMappings: [],
  wildcards: [],
  messageKeys: [],
  rawFiles: [],
};

describe('workbench server', () => {
  it('returns validation issues for a posted spec', async () => {
    const app = buildServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/validate',
      payload: { spec },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeGreaterThan(0);
    expect(body.issues.map((issue: { code: string }) => issue.code)).toContain(
      'PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN',
    );
  });

  it('rejects a request without a spec', async () => {
    const app = buildServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/validate',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});
