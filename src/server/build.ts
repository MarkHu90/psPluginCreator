import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { GeneratedFile, ZipArtifact } from '../core/index';
import { safePath } from '../workspace/safePath';

export async function writeBuildAtomically(
  buildDir: string,
  files: GeneratedFile[],
  zips?: Record<ZipArtifact, Uint8Array>,
): Promise<void> {
  const parent = dirname(buildDir);
  await mkdir(parent, { recursive: true });
  const temp = await mkdtemp(join(parent, '.build-tmp-'));
  let backup: string | undefined;

  try {
    for (const file of files) {
      const target = await safePath(temp, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }
    if (zips) {
      for (const [artifact, bytes] of Object.entries(zips)) {
        await writeFile(join(temp, `${artifact}.zip`), bytes);
      }
    }

    backup = `${buildDir}.old-${Date.now()}`;
    try {
      await rename(buildDir, backup);
    } catch (error) {
      backup = undefined;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await rename(temp, buildDir);
    if (backup) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(temp, { recursive: true, force: true });
    if (backup) {
      await rename(backup, buildDir).catch(() => undefined);
    }
    throw error;
  }
}
