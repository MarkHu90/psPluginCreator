import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalFsWorkspaceStore } from './localFsStore';
import { WorkspaceError } from './errors';

let root = '';
let store: LocalFsWorkspaceStore;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ps-workspace-'));
  store = new LocalFsWorkspaceStore(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('project CRUD', () => {
  it('creates, lists and reads a project', async () => {
    const project = await store.create('local', { name: 'Demo Plugin' });
    expect(project.key).toBe('demo-plugin');
    expect(project.revision).toBe(1);

    const list = await store.list('local');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      key: 'demo-plugin',
      name: 'Demo Plugin',
      version: '1.0.0',
    });

    const read = await store.readSpec({
      tenant: 'local',
      key: 'demo-plugin',
    });
    expect((read.spec as { plugin: { name: string } }).plugin.name).toBe(
      'Demo Plugin',
    );
    expect(read.revision).toBe(1);
  });

  it('appends a suffix when the slug already exists', async () => {
    const first = await store.create('local', { name: 'Demo Plugin' });
    const second = await store.create('local', { name: 'Demo Plugin' });
    expect(first.key).toBe('demo-plugin');
    expect(second.key).toBe('demo-plugin-2');
  });

  it('rejects an explicit duplicate key', async () => {
    await store.create('local', { key: 'demo', name: 'Demo' });
    await expect(
      store.create('local', { key: 'demo', name: 'Other' }),
    ).rejects.toMatchObject({ code: 'KEY_EXISTS' });
  });

  it('removes a project and returns NOT_FOUND afterwards', async () => {
    await store.create('local', { name: 'Demo' });
    await store.remove({ tenant: 'local', key: 'demo' });
    await expect(
      store.get({ tenant: 'local', key: 'demo' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('spec writes', () => {
  it('increments revision and persists the spec', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };
    const current = (await store.readSpec(ref)).spec as {
      plugin: Record<string, unknown>;
    } & Record<string, unknown>;
    const spec = {
      ...current,
      plugin: { ...current.plugin, description: 'Updated' },
    };

    const result = await store.writeSpec(ref, spec, 1);
    expect(result.revision).toBe(2);

    const stored = JSON.parse(
      await readFile(join(root, 'local', project.key, 'plugin.json'), 'utf8'),
    );
    expect(stored.plugin.description).toBe('Updated');
  });

  it('rejects a stale revision without writing', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };
    const { spec } = await store.readSpec(ref);
    await store.writeSpec(ref, spec, 1);

    await expect(store.writeSpec(ref, spec, 1)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    const projectFile = JSON.parse(
      await readFile(join(root, 'local', project.key, 'project.json'), 'utf8'),
    );
    expect(projectFile.revision).toBe(2);
  });

  it('rejects a spec whose key does not match the project', async () => {
    const project = await store.create('local', { name: 'Demo' });
    const ref = { tenant: 'local', key: project.key };
    const { spec } = await store.readSpec(ref);
    await expect(
      store.writeSpec(ref, { ...(spec as object), key: 'other' }, 1),
    ).rejects.toBeInstanceOf(WorkspaceError);
  });
});
