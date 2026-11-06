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
