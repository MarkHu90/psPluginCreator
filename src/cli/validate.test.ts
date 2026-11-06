import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { formatIssues, validateSpecFile } from './validate';

const tempDirs: string[] = [];

async function writeSpec(spec: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'psplugin-'));
  tempDirs.push(dir);
  const path = join(dir, 'plugin.json');
  await writeFile(path, JSON.stringify(spec), 'utf8');
  return path;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function baseSpec(): any {
  return {
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
    pages: [],
    navigation: [],
    powerQueries: [],
    accessRequest: [],
    permissionMappings: [],
    wildcards: [],
    messageKeys: [],
    rawFiles: [],
  };
}

describe('CLI validate', () => {
  it('reads a spec file and reports errors', async () => {
    const spec = baseSpec();
    spec.pages = [
      {
        id: 'p1',
        kind: 'custom',
        context: 'student',
        path: 'students/foo.html',
        title: { en: 'Foo' },
      },
    ];
    const path = await writeSpec(spec);

    const result = await validateSpecFile(path);

    expect(result.errors).toBeGreaterThan(0);
    expect(result.issues.map((issue) => issue.code)).toContain(
      'PAGE_STUDENT_CONTEXT_MUST_USE_GUARDIAN',
    );
  });

  it('formats issues for stderr/stdout', () => {
    expect(
      formatIssues([
        {
          severity: 'error',
          code: 'X',
          message: 'broken',
          path: 'a.b',
        },
      ]),
    ).toContain('ERROR X a.b\n  broken');
  });
});
