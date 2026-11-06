import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { createDefaultSpec, type PluginSpec } from '../core/index';
import { WorkspaceError } from './errors';
import { assertValidKey, safePath, slugifyKey } from './safePath';
import type {
  CreateProjectInput,
  Project,
  ProjectRef,
  ProjectSummary,
} from './types';

async function writeAtomic(
  target: string,
  data: string | Uint8Array,
): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const temp = join(
    dirname(target),
    `.${basename(target)}.tmp-${randomUUID()}`,
  );
  await writeFile(temp, data);
  await rename(temp, target);
}

export class LocalFsWorkspaceStore {
  private readonly locks = new Map<string, Promise<void>>();

  constructor(private readonly root: string) {}

  private tenantDir(tenant: string): string {
    assertValidKey(tenant);
    return resolve(this.root, tenant);
  }

  private projectDir(ref: ProjectRef): string {
    assertValidKey(ref.tenant);
    assertValidKey(ref.key);
    return resolve(this.tenantDir(ref.tenant), ref.key);
  }

  private async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.locks.get(lockKey) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolveGate) => {
      release = resolveGate;
    });
    const queued = previous.then(() => gate);
    this.locks.set(lockKey, queued);
    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(lockKey) === queued) this.locks.delete(lockKey);
    }
  }

  private async uniqueKey(tenant: string, base: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    for (;;) {
      try {
        await readFile(join(this.tenantDir(tenant), candidate, 'project.json'));
        candidate = `${base}-${suffix}`;
        suffix += 1;
      } catch {
        return candidate;
      }
    }
  }

  async list(tenant: string): Promise<ProjectSummary[]> {
    const dir = this.tenantDir(tenant);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }

    const out: ProjectSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const key = entry.name;
      try {
        const project = await this.get({ tenant, key });
        const spec = JSON.parse(
          await readFile(join(this.projectDir({ tenant, key }), 'plugin.json'), 'utf8'),
        ) as PluginSpec;
        out.push({
          key,
          name: spec.plugin?.name ?? key,
          version: spec.plugin?.version ?? '',
          updatedAt: project.updatedAt,
        });
      } catch {
        // Skip corrupt or partially written projects.
      }
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  }

  async create(
    tenant: string,
    input: CreateProjectInput,
  ): Promise<Project> {
    assertValidKey(tenant);
    if (!input.name.trim()) {
      throw new WorkspaceError('BAD_REQUEST', 'Project name is required.');
    }

    let key: string;
    if (input.key !== undefined) {
      assertValidKey(input.key);
      try {
        await readFile(join(this.tenantDir(tenant), input.key, 'project.json'));
        throw new WorkspaceError('KEY_EXISTS', `Project already exists: ${input.key}`);
      } catch (error) {
        if (error instanceof WorkspaceError) throw error;
      }
      key = input.key;
    } else {
      key = await this.uniqueKey(tenant, slugifyKey(input.name));
    }

    const dir = this.projectDir({ tenant, key });
    await mkdir(this.tenantDir(tenant), { recursive: true });
    try {
      await mkdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new WorkspaceError('KEY_EXISTS', `Project already exists: ${key}`);
      }
      throw error;
    }

    const now = new Date().toISOString();
    const project: Project = {
      key,
      tenant,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    const spec = createDefaultSpec({
      key,
      name: input.name,
      publisher: input.publisher,
    });

    await writeAtomic(join(dir, 'plugin.json'), `${JSON.stringify(spec, null, 2)}\n`);
    await mkdir(join(dir, 'files'), { recursive: true });
    await writeAtomic(join(dir, 'project.json'), `${JSON.stringify(project, null, 2)}\n`);
    return project;
  }

  async get(ref: ProjectRef): Promise<Project> {
    const target = join(this.projectDir(ref), 'project.json');
    let raw: string;
    try {
      raw = await readFile(target, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new WorkspaceError('NOT_FOUND', `Project not found: ${ref.key}`);
      }
      throw error;
    }
    const project = JSON.parse(raw) as Project;
    if (project.key !== ref.key || project.tenant !== ref.tenant) {
      throw new WorkspaceError('IO_ERROR', `Project metadata mismatch: ${ref.key}`);
    }
    return project;
  }

  async remove(ref: ProjectRef): Promise<void> {
    try {
      await rm(this.projectDir(ref), { recursive: true, force: false });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new WorkspaceError('NOT_FOUND', `Project not found: ${ref.key}`);
      }
      throw error;
    }
  }

  async readSpec(ref: ProjectRef): Promise<{
    spec: unknown;
    revision: number;
    updatedAt: string;
  }> {
    const project = await this.get(ref);
    const raw = await readFile(
      join(this.projectDir(ref), 'plugin.json'),
      'utf8',
    );
    return {
      spec: JSON.parse(raw),
      revision: project.revision,
      updatedAt: project.updatedAt,
    };
  }

  async writeSpec(
    ref: ProjectRef,
    spec: unknown,
    expectedRevision: number,
  ): Promise<{ revision: number; updatedAt: string }> {
    return this.withLock(`${ref.tenant}/${ref.key}`, async () => {
      if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
        throw new WorkspaceError('BAD_REQUEST', 'Spec must be an object.');
      }
      const project = await this.get(ref);
      if (project.revision !== expectedRevision) {
        throw new WorkspaceError(
          'CONFLICT',
          `Revision conflict: expected ${expectedRevision}, found ${project.revision}`,
          [{ revision: project.revision }],
        );
      }
      const specKey = (spec as { key?: unknown }).key;
      if (specKey !== undefined && specKey !== ref.key) {
        throw new WorkspaceError(
          'KEY_INVALID',
          `Spec key must match the project key: ${ref.key}`,
        );
      }

      const now = new Date().toISOString();
      await writeAtomic(
        join(this.projectDir(ref), 'plugin.json'),
        `${JSON.stringify(spec, null, 2)}\n`,
      );
      const next: Project = {
        ...project,
        revision: project.revision + 1,
        updatedAt: now,
      };
      await writeAtomic(
        join(this.projectDir(ref), 'project.json'),
        `${JSON.stringify(next, null, 2)}\n`,
      );
      return { revision: next.revision, updatedAt: now };
    });
  }

  buildDir(ref: ProjectRef): string {
    return join(this.projectDir(ref), 'build');
  }
}
