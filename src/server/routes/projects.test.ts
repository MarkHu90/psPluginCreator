import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../app';
import type { FastifyInstance } from 'fastify';
import { createDefaultSpec } from '../../core/index';

let dir = '';
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ps-server-'));
  app = buildServer({ workspacesDir: dir, maxFileBytes: 64 });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

async function createProject(key = 'demo', name = 'Demo Plugin') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { key, name },
  });
  expect(response.statusCode).toBe(201);
  return response.json() as {
    project: { key: string; revision: number };
    spec: { key: string };
  };
}

describe('project routes', () => {
  it('creates and lists projects', async () => {
    await createProject();
    const response = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(response.statusCode).toBe(200);
    expect(response.json().projects).toHaveLength(1);
    expect(response.json().projects[0].key).toBe('demo');
  });

  it('reads a project with its spec and baseline', async () => {
    await createProject();
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/demo',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.project.key).toBe('demo');
    expect(body.spec.plugin.name).toBe('Demo Plugin');
    expect(body.navBaseline).toBeNull();
  });

  it('returns 404 for an unknown project', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/missing',
    });
    expect(response.statusCode).toBe(404);
  });

  it('rejects a stale revision with 409', async () => {
    const { spec } = await createProject();
    const first = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec, revision: 1 },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().revision).toBe(2);

    const second = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec, revision: 1 },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('CONFLICT');
  });

  it('validates the stored spec', async () => {
    const created = await createProject();
    const invalid = createDefaultSpec({ key: 'demo', name: 'Demo Plugin' });
    invalid.pages.push({
      id: 'p1',
      kind: 'custom',
      context: 'student',
      path: 'students/foo.html',
      title: { en: 'Foo' },
    });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec: invalid, revision: created.project.revision },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/validate',
    });
    expect(response.statusCode).toBe(200);
    expect(
      response.json().issues.map((issue: { code: string }) => issue.code),
    ).toContain('PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN');
  });

  it('deletes a project', async () => {
    await createProject();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/projects/demo',
    });
    expect(response.statusCode).toBe(204);
    const list = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(list.json().projects).toHaveLength(0);
  });
});

import { unzipSync } from 'fflate';

function multipartBody(
  boundary: string,
  filename: string,
  content: string,
): string {
  return [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    'Content-Type: application/octet-stream',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

describe('generate and download', () => {
  it('refuses to generate while validation has errors', async () => {
    const created = await createProject();
    const invalid = createDefaultSpec({ key: 'demo', name: 'Demo Plugin' });
    invalid.pages.push({
      id: 'p1',
      kind: 'custom',
      context: 'student',
      path: 'students/foo.html',
      title: { en: 'Foo' },
    });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec: invalid, revision: created.project.revision },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/generate',
      payload: {},
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_FAILED');
  });

  it('generates build output, baseline and a downloadable zip', async () => {
    const created = await createProject();
    const spec = createDefaultSpec({
      key: 'demo',
      name: 'Demo Plugin',
      publisher: { name: 'P', email: 'p@example.com' },
    });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec, revision: created.project.revision },
    });

    const generated = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/generate',
      payload: {},
    });
    expect(generated.statusCode).toBe(200);
    const body = generated.json();
    expect(body.files).toContain('api/plugin.xml');
    expect(body.artifacts).toEqual({ api: true, dbsetup: true, combined: true });
    expect(body.navBaseline).toEqual([]);

    const download = await app.inject({
      method: 'GET',
      url: '/api/projects/demo/download/combined',
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers['content-disposition']).toContain(
      'demo-combined.zip',
    );
    const entries = unzipSync(new Uint8Array(download.rawPayload));
    expect(Object.keys(entries)).toContain('plugin.xml');
  });

  it('generates from a spec whose arrays are omitted', async () => {
    const created = await createProject();
    const full = createDefaultSpec({ key: 'demo', name: 'Demo Plugin' });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: {
        spec: {
          schemaVersion: 1,
          key: 'demo',
          plugin: {
            ...full.plugin,
            publisher: { name: 'P', email: 'p@example.com' },
          },
        },
        revision: created.project.revision,
      },
    });

    const generated = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/generate',
      payload: {},
    });
    expect(generated.statusCode).toBe(200);
    expect(generated.json().files).toContain('api/plugin.xml');
  });

  it('returns BUILD_MISSING before the first build', async () => {
    await createProject();
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/demo/download/combined',
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('BUILD_MISSING');
  });
});

describe('raw files API', () => {
  it('uploads, lists and deletes a raw file', async () => {
    await createProject();
    const boundary = '----ps-test';
    const upload = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/files?path=api/web_root/scripts/a.js',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'a.js', 'console.log(1);'),
    });
    expect(upload.statusCode).toBe(201);
    expect(upload.json().file.path).toBe('api/web_root/scripts/a.js');

    const list = await app.inject({
      method: 'GET',
      url: '/api/projects/demo/files',
    });
    expect(list.json().files).toHaveLength(1);

    const deleted = await app.inject({
      method: 'DELETE',
      url: '/api/projects/demo/files?path=api/web_root/scripts/a.js',
    });
    expect(deleted.statusCode).toBe(204);
  });

  it('rejects unsafe paths and oversized uploads', async () => {
    await createProject();
    const boundary = '----ps-test';
    const unsafe = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/files?path=../evil',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'evil', 'x'),
    });
    expect(unsafe.statusCode).toBe(400);

    const tooLarge = await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/files?path=big.bin',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'big.bin', 'x'.repeat(65)),
    });
    expect(tooLarge.statusCode).toBe(413);
  });

  it('includes referenced raw files in the generated build', async () => {
    const created = await createProject();
    const boundary = '----ps-test';
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/files?path=api/web_root/scripts/a.js',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, 'a.js', 'console.log(1);'),
    });

    const spec = createDefaultSpec({
      key: 'demo',
      name: 'Demo Plugin',
      publisher: { name: 'P', email: 'p@example.com' },
    });
    spec.rawFiles.push({ path: 'api/web_root/scripts/a.js' });
    await app.inject({
      method: 'PUT',
      url: '/api/projects/demo/spec',
      payload: { spec, revision: created.project.revision },
    });

    const generated = await app.inject({
      method: 'POST',
      url: '/api/projects/demo/generate',
      payload: {},
    });
    expect(generated.statusCode).toBe(200);
    expect(generated.json().files).toContain(
      'api/web_root/scripts/a.js',
    );
  });
});
