import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('serves the SPA index for deep links and JSON 404 for API paths', async () => {
    const webRoot = await mkdtemp(join(tmpdir(), 'ps-web-'));
    await writeFile(join(webRoot, 'index.html'), '<!doctype html><title>App</title>');
    const app = buildServer({ webRoot });
    try {
      const deepLink = await app.inject({
        method: 'GET',
        url: '/projects/demo/overview',
      });
      expect(deepLink.statusCode).toBe(200);
      expect(deepLink.headers['content-type']).toContain('text/html');
      expect(deepLink.body).toContain('App');

      const root = await app.inject({ method: 'GET', url: '/' });
      expect(root.statusCode).toBe(200);
      expect(root.body).toContain('App');

      const api = await app.inject({ method: 'GET', url: '/api/nope' });
      expect(api.statusCode).toBe(404);
      expect(api.json()).toEqual({
        error: { code: 'NOT_FOUND', message: 'Not found.' },
      });
    } finally {
      await app.close();
      await rm(webRoot, { recursive: true, force: true });
    }
  });
});
