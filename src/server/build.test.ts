import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GeneratedFile } from '../core/index';
import { writeBuildAtomically } from './build';

let dir = '';
let buildDir = '';

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ps-build-'));
  buildDir = join(dir, 'build');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('writeBuildAtomically', () => {
  it('serializes concurrent writes to the same build directory', async () => {
    const writes = Array.from({ length: 3 }, (_, index) => {
      const files: GeneratedFile[] = [
        {
          path: 'api/plugin.xml',
          content: `<plugin version="${index}" />`,
          source: 'generated',
        },
      ];
      return writeBuildAtomically(buildDir, files);
    });

    await expect(Promise.all(writes)).resolves.toHaveLength(3);

    const content = await readFile(join(buildDir, 'api/plugin.xml'), 'utf8');
    expect(content).toContain('<plugin');

    const leftovers = (await readdir(dir)).filter(
      (name) => name.startsWith('.build-tmp-') || name.includes('.old-'),
    );
    expect(leftovers).toEqual([]);
  });
});
